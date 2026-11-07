/** Only versioned public model data may use the model compression path. */
export const MODEL_DELIVERY_FILES = Object.freeze([
  'assets/models/parametric-base-v1.glb',
  'assets/parametric/attachments/short02.json',
  'assets/parametric/attachments/tee.json',
]);
export const isModelDeliveryFile = file => MODEL_DELIVERY_FILES.includes(file);
