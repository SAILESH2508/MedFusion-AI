# MedFusion AI — Anatomical 3D Model Ingestion Guide

This directory holds **high-quality, licensed 3D anatomical models (`.glb` / `.gltf`)** for MedFusion AI's Personal Health Twin viewer.

---

## 1. Directory Structure

```text
frontend/public/models/organs/
├── dataset_manifest.json     # Model transforms, metadata, and licensing records
├── README.md                 # Ingestion & conversion instructions
├── heart.glb                 # Human Heart & Great Vessels
├── lungs.glb                 # Trachea, Bronchi & Lungs
├── liver.glb                 # Liver & Gallbladder
├── kidneys.glb               # Kidneys & Ureters
└── brain.glb                 # Cerebrum, Cerebellum & Brainstem
```

> **Note**: If any `.glb` file is absent from this folder, MedFusion AI's 3D engine automatically activates a procedural WebGL fallback geometry. The app never crashes or displays missing textures.

---

## 2. Licensed Dataset Sources

### A. Zygote 3D Anatomy (Commercial Enterprise)
- **Website**: [zygote.com](https://www.zygote.com) / [3dscience.com](https://www.3dscience.com)
- **Type**: Solid CAD & surface anatomy datasets segmented from medical imagery and certified by certified medical illustrators.
- **Acquisition**: Purchase commercial license and download OBJ/FBX files.
- **Conversion**: Follow the optimization pipeline below to export as Draco-compressed `.glb`.

### B. BioDigital Human (Interactive Cloud Platform)
- **Website**: [biodigital.com](https://www.biodigital.com)
- **Type**: Cloud-streamed interactive 3D human body.
- **Integration**: BioDigital protects models behind its proprietary WebGL streaming engine. Integration in MedFusion AI is implemented via the **BioDigital Cloud Viewer** (`BioDigitalViewer.jsx`), which uses BioDigital's Human API and iframe embed keys.

### C. Open-Access & Scientific Alternatives (Free / Creative Commons)
- **NIH 3D Print Exchange (US National Institutes of Health)**: [3d.nih.gov](https://3d.nih.gov)
  - Public Domain & CC-BY 3.0 models extracted from clinical CT/MRI scans.
- **BodyParts3D (DBCLS Japan)**: [lifesciencedb.jp/bp3d](https://lifesciencedb.jp/bp3d/)
  - Complete anatomical atlas under CC-BY-SA 2.1 Japan.
- **OpenAnatomy / Harvard Surgical Planning Lab**: [openanatomy.org](https://www.openanatomy.org)
  - Academic-grade neurological, cardiovascular, and abdominal segmentations.

---

## 3. Recommended Optimization Pipeline

Medical CAD meshes often contain 1,000,000+ polygons and can exceed 150MB. For optimal 60 FPS WebGL rendering in browser viewports:

1. **Target Polygon Budget**: 25,000 – 60,000 triangles per organ.
2. **Decimate in Blender**:
   - Import high-poly OBJ/FBX.
   - Apply `Decimate` modifier (collapse ratio 0.1 – 0.25).
   - Ensure UV unwrapping is preserved.
3. **Draco Compression & GLB Export**:
   Run the following using `@gltf-transform` or `gltf-pipeline`:
   ```bash
   npx gltf-pipeline -i raw_model.glb -o heart.glb -d --draco.compressionLevel 7
   ```
4. **Copy to Public Folder**:
   Place the resulting `heart.glb` directly into `frontend/public/models/organs/heart.glb`.
