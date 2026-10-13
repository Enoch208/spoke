export const uploadCopy = {
  titles: {
    productImage: "Add product image",
    deliverable: "Add the file buyers get",
    logo: "Upload logo",
    avatar: "Change photo",
  },
  drop: "Drop a file here, or choose one",
  choose: "Choose file",
  helpers: {
    productImage: "PNG, JPG or WebP, up to 5 MB. At least 1200 × 800 px looks best.",
    deliverable: "PDF, ZIP, EPUB, MP4, PNG, JPG, WebP, CSV, TXT or MD, up to 25 MB.",
    logo: "PNG, JPG or WebP, up to 2 MB. Square works best.",
    avatar: "PNG, JPG or WebP, up to 2 MB. Square works best.",
  },
  privateNote:
    "Private. Only buyers with a confirmed receipt can download it, through a link that expires.",
  uploading: "Uploading…",
  uploaded: "Uploaded",
  hash: "Content hash",
  hashHelper:
    "This hash goes into the product’s fingerprint so anyone can check the file wasn’t swapped.",
  demo: "Sample upload, kept in this browser only.",
  save: "Save",
  remove: "Choose another file",
  errors: {
    type: "That file type isn’t supported. Use {types}.",
    executable: "Executable files can’t be delivered through Spoke.",
    size: "That file is {size}. The limit is {limit}.",
    empty: "That file is empty.",
    failed: "Upload failed. Check your connection and try again.",
  },
  tryAgain: "Try again",
  avatarUnavailable: "Photo uploads aren’t available yet.",
  stopTitle: "Stop uploading {filename}?",
  toast: "{filename} uploaded",
} as const;
