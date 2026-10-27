import { solveGarmentContact } from './posedGarmentContact.js';

self.onmessage = ({ data }) => {
  try {
    const solved = solveGarmentContact(data.payload);
    self.postMessage({ revision: data.revision, ...solved }, [solved.positions.buffer]);
  } catch (error) { self.postMessage({ revision: data.revision, error: error.message || 'Garment fitting failed.' }); }
};
