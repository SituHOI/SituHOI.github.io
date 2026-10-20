window.SITUHOI = {
  links: {
    paper: "https://arxiv.org/pdf/2610.23980",
    code: "",
    dataset: ""
  },
  benchmark: {
    maxSeconds: 4,
    results: [
      { h: 0.25, f: 0.50, root: 102.09, object: 21.43, objectSD: 0.01, f1: 85.75 },
      { h: 0.50, f: 1.00, root: 145.45, object: 45.13, objectSD: 0.06, f1: 79.55 },
      { h: 0.50, f: 3.50, root: 331.21, object: 123.83, objectSD: 0.70, f1: 58.90 },
      { h: 1.00, f: 2.00, root: 217.63, object: 76.68, objectSD: 0.26, f1: 69.29 },
      { h: 2.00, f: 1.00, root: 153.42, object: 43.07, objectSD: 0.05, f1: 78.25 },
      { h: 3.00, f: 0.50, root: 96.28, object: 19.68, objectSD: 0.02, f1: 85.30 },
      { h: 0.85, f: 1.60, root: 186.86, object: 64.83, objectSD: 0.22, f1: 73.14, heldOut: true },
      { h: 1.50, f: 0.80, root: 131.88, object: 33.41, objectSD: 0.05, f1: 81.03, heldOut: true },
      { h: 0.25, f: 3.75, root: 355.04, object: 132.92, objectSD: 0.66, f1: 58.08 },
      { h: 3.75, f: 0.25, root: 64.87, object: 9.39, objectSD: 0.00, f1: 90.93 },
      { h: 0.37, f: 2.81, root: 274.27, object: 100.41, objectSD: 0.53, f1: 63.51 }
    ]
  },
  media: {
    pipeline: { src: "assets/pipeline.webp", alt: "SituHOI construction pipeline: room scans and RGB-D interactions feed scene reconstruction, camera localization, human fitting, and object tracking, producing scene-aligned motion with language annotations." },
    benchmark: { src: "assets/benchmark.webp", width: 3600, height: 1275, alt: "SharedHOI for FlexHOI-Bench: motion history, scene and object geometry, an object goal, and query durations are encoded by a shared transformer; human prediction and object refinement produce future motion in scene coordinates." }
  }
};
