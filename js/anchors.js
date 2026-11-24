// Places in the booth where a product can be shown.
// A product in the data file lists one or more anchor ids. The first anchor
// gets the floating "i" marker and is used for "Go to product".
// "model" anchors show a 3D object; the product "model" field can change its shape.

export const ANCHORS = [
  { id: 'A_front_tv', label: 'Wall A front – 42" TV' },
  { id: 'A_front_cabinet', label: 'Wall A front – cabinet top (glass case)', model: 'switchgear' },
  { id: 'A_back_tv', label: 'Wall A back – 42" TV' },
  { id: 'B_front_tv1', label: 'Wall B front – 50" touch screen (left)' },
  { id: 'B_front_tv2', label: 'Wall B front – 50" TV (right)' },
  { id: 'B_front_shelf', label: 'Wall B front – shelf', model: 'laptop' },
  { id: 'B_front_cabinet', label: 'Wall B front – small cabinet top', model: 'sensorbox' },
  { id: 'B_front_glass', label: 'Wall B front – tall glass case', model: 'opencase' },
  { id: 'B_back_panel', label: 'Wall B back – full wall graphic' },
  { id: 'B_back_tv1', label: 'Wall B back – 42" TV (left)' },
  { id: 'B_back_tv2', label: 'Wall B back – 42" TV (right)' },
  { id: 'B_back_shelf', label: 'Wall B back – shelf', model: 'devices' },
  { id: 'C_front_tv1', label: 'Wall C front – 42" TV (left)' },
  { id: 'C_front_tv2', label: 'Wall C front – 42" TV (middle)' },
  { id: 'C_front_tv3', label: 'Wall C front – 42" TV (right)' },
  { id: 'C_front_cabinet', label: 'Wall C front – long cabinet, full length', model: 'container-hv' },
  { id: 'C_front_cabinet1', label: 'Wall C front – long cabinet, left', model: 'modules' },
  { id: 'C_front_cabinet2', label: 'Wall C front – long cabinet, middle', model: 'transformer' },
  { id: 'C_front_cabinet3', label: 'Wall C front – long cabinet, right', model: 'container' },
  { id: 'C_back_tv1', label: 'Wall C back – 42" TV (left)' },
  { id: 'C_back_tv2', label: 'Wall C back – 42" TV (right)' },
  { id: 'C_back_shelf', label: 'Wall C back – shelf', model: 'vrlaptop' },
  { id: 'C_back_floor', label: 'Wall C back – floor unit', model: 'cabinet' },
  { id: 'LED_wall', label: 'LED video wall (4 m × 2.5 m)' },
  { id: 'counter', label: 'Reception counter' },
];

export const MODEL_KINDS = [
  'switchgear', 'laptop', 'vrlaptop', 'sensorbox', 'opencase', 'devices',
  'modules', 'transformer', 'container', 'container-hv', 'cabinet',
];
