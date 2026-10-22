import importlib.util
from pathlib import Path
import unittest
import numpy as np

spec = importlib.util.spec_from_file_location("converter", Path(__file__).resolve().parents[1] / "build-makehuman-glb.py")
converter = importlib.util.module_from_spec(spec)
spec.loader.exec_module(converter)

class FeatureTopologyTest(unittest.TestCase):
    def test_vertex_valence_does_not_drop_half_a_quad(self):
        source = {"coord": np.array([[0, 0, 0], [1, 0, 0], [1, 1, 0], [0, 1, 0]], dtype=np.float32),
                  "texco": np.array([[0, 0], [1, 0], [1, 1], [0, 1]], dtype=np.float32),
                  "fvert": np.array([[0, 1, 2, 3]]), "fuvs": np.array([[0, 1, 2, 3]]),
                  "nfaces": np.array([1, 1, 1, 1])}
        result = converter.make_static_mesh(source, np.zeros(3), 0, 1, (0, 0, 0), (1, 1, 1))
        self.assertEqual(result["indices"].tolist(), [0, 1, 2, 0, 2, 3])
        source["fvert"] = np.array([[0, 1, 2, 0]])
        source["fuvs"] = np.array([[0, 1, 2, 0]])
        result = converter.make_static_mesh(source, np.zeros(3), 0, 1, (0, 0, 0), (1, 1, 1))
        self.assertEqual(result["indices"].tolist(), [0, 1, 2])

if __name__ == "__main__":
    unittest.main()
