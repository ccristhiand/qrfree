/* =========================================
   QR Free · Worker de IA (Transformers.js)
   Corre los modelos en un hilo aparte para no congelar la página.
   - Quitar fondo: MODNet (Apache-2.0), retrato de personas
   - Transcribir: Whisper (MIT), voz a texto
   Los modelos se descargan una vez desde Hugging Face y quedan en la caché del navegador.
   ========================================= */
import { AutoModel, AutoProcessor, RawImage, pipeline, env } from "https://cdn.jsdelivr.net/npm/@huggingface/transformers@3.0.2";

env.allowLocalModels = false;

const state = { bg: null, asr: null, asrModel: null };

async function hasWebGPU() {
    try { return !!(self.navigator.gpu && await self.navigator.gpu.requestAdapter()); } catch (e) { return false; }
}
const progress = (id) => (p) => {
    if (p.status === "progress" || p.status === "done" || p.status === "initiate") {
        self.postMessage({ id, type: "progress", file: p.file, loaded: p.loaded || 0, total: p.total || 0, status: p.status });
    }
};

async function loadBackground(id) {
    if (state.bg) return state.bg;
    const gpu = await hasWebGPU();
    const opts = { dtype: "fp32", progress_callback: progress(id) };
    let model;
    try { model = await AutoModel.from_pretrained("Xenova/modnet", Object.assign({ device: gpu ? "webgpu" : "wasm" }, opts)); }
    catch (e) { model = await AutoModel.from_pretrained("Xenova/modnet", Object.assign({ device: "wasm" }, opts)); }
    const processor = await AutoProcessor.from_pretrained("Xenova/modnet", { progress_callback: progress(id) });
    state.bg = { model, processor, device: gpu ? "webgpu" : "wasm" };
    return state.bg;
}

async function loadAsr(id, modelId) {
    if (state.asr && state.asrModel === modelId) return state.asr;
    if (state.asr && state.asr.dispose) { try { await state.asr.dispose(); } catch (e) { /* nada */ } }
    const gpu = await hasWebGPU();
    const mk = (device) => pipeline("automatic-speech-recognition", modelId, {
        device,
        dtype: device === "webgpu" ? { encoder_model: "fp32", decoder_model_merged: "q4" } : "q8",
        progress_callback: progress(id),
    });
    try { state.asr = await mk(gpu ? "webgpu" : "wasm"); }
    catch (e) { state.asr = await mk("wasm"); }
    state.asrModel = modelId;
    return state.asr;
}

self.onmessage = async ({ data }) => {
    const { id, type } = data;
    try {
        if (type === "bg") {
            const { model, processor } = await loadBackground(id);
            self.postMessage({ id, type: "status", text: "Detectando a la persona…" });
            const image = await RawImage.fromBlob(data.blob);
            const { pixel_values } = await processor(image);
            const { output } = await model({ input: pixel_values });
            const mask = await RawImage.fromTensor(output[0].mul(255).to("uint8")).resize(image.width, image.height);
            const buf = new Uint8ClampedArray(mask.data);
            self.postMessage({ id, type: "done", mask: buf, width: mask.width, height: mask.height }, [buf.buffer]);
        } else if (type === "asr") {
            const asr = await loadAsr(id, data.model);
            self.postMessage({ id, type: "status", text: "Transcribiendo…" });
            const out = await asr(data.audio, {
                language: data.language || "spanish",
                task: data.task || "transcribe",
                chunk_length_s: 30,
                stride_length_s: 5,
                return_timestamps: true,
            });
            self.postMessage({ id, type: "done", text: out.text, chunks: out.chunks || [] });
        }
    } catch (err) {
        self.postMessage({ id, type: "error", message: String(err && err.message || err) });
    }
};
