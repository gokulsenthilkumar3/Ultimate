#!/usr/bin/env python3
"""Bake the packed ORM red channel into each humanoid skin albedo in-place."""

from __future__ import annotations

import io
import json
import os
import struct
import sys
from pathlib import Path

import numpy as np
from PIL import Image


JSON_CHUNK = 0x4E4F534A
BIN_CHUNK = 0x004E4942
ROOT = Path(__file__).resolve().parent.parent
DEFAULT_ASSETS = (
    ROOT / "public/assets/models/humanoid-base.glb",
    ROOT / "public/assets/models/humanoid-base-lite.glb",
)
ALBEDO_NAMES = ("SkinAlbedo_YoungMale", "SkinAlbedo_Light", "SkinAlbedo_Deep")
AO_NAME = "SkinAO_Roughness_GeometryBaked"
AO_STRENGTH = 0.65


def parse_glb(path: Path):
    payload = path.read_bytes()
    if payload[:4] != b"glTF":
        raise ValueError(f"{path} is not a GLB")
    chunks = []
    offset = 12
    while offset < len(payload):
        length, kind = struct.unpack_from("<II", payload, offset)
        data = payload[offset + 8 : offset + 8 + length]
        chunks.append([kind, data])
        offset += 8 + length
    json_index = next(i for i, (kind, _) in enumerate(chunks) if kind == JSON_CHUNK)
    bin_index = next(i for i, (kind, _) in enumerate(chunks) if kind == BIN_CHUNK)
    document = json.loads(chunks[json_index][1].decode("utf-8").rstrip(" \x00"))
    return chunks, json_index, bin_index, document


def image_bytes(document, binary, image):
    view = document["bufferViews"][image["bufferView"]]
    start = view.get("byteOffset", 0)
    return binary[start : start + view["byteLength"]]


def bake_albedo(albedo_bytes: bytes, ao_image: Image.Image) -> bytes:
    with Image.open(io.BytesIO(albedo_bytes)) as source:
        albedo = source.convert("RGBA")
    ao = ao_image.resize(albedo.size, Image.Resampling.LANCZOS).convert("RGB")
    rgba = np.asarray(albedo, dtype=np.float32) / 255.0
    ao_channel = np.asarray(ao, dtype=np.float32)[:, :, 0] / 255.0

    srgb = rgba[:, :, :3]
    linear = np.where(srgb <= 0.04045, srgb / 12.92, ((srgb + 0.055) / 1.055) ** 2.4)
    occlusion = 1.0 - AO_STRENGTH * (1.0 - ao_channel)
    linear *= occlusion[:, :, None]
    baked = np.where(linear <= 0.0031308, linear * 12.92, 1.055 * (linear ** (1.0 / 2.4)) - 0.055)
    rgba[:, :, :3] = np.clip(baked, 0.0, 1.0)
    output_image = Image.fromarray(np.rint(rgba * 255.0).astype(np.uint8), "RGBA")
    output = io.BytesIO()
    output_image.save(output, format="PNG", optimize=True, compress_level=9)
    return output.getvalue()


def rebuild_binary(document, old_binary: bytes, replacements: dict[int, bytes]) -> bytes:
    pieces = []
    offset = 0
    for index, view in enumerate(document.get("bufferViews", [])):
        old_start = view.get("byteOffset", 0)
        data = replacements.get(index, old_binary[old_start : old_start + view["byteLength"]])
        padding = (-offset) % 4
        if padding:
            pieces.append(b"\x00" * padding)
            offset += padding
        view["byteOffset"] = offset
        view["byteLength"] = len(data)
        pieces.append(data)
        offset += len(data)
    final_padding = (-offset) % 4
    if final_padding:
        pieces.append(b"\x00" * final_padding)
        offset += final_padding
    document["buffers"][0]["byteLength"] = offset
    return b"".join(pieces)


def encode_glb(chunks, json_index, bin_index, document, binary):
    json_payload = json.dumps(document, separators=(",", ":")).encode("utf-8")
    json_payload += b" " * ((-len(json_payload)) % 4)
    chunks[json_index][1] = json_payload
    chunks[bin_index][1] = binary
    body = b"".join(struct.pack("<II", len(data), kind) + data for kind, data in chunks)
    return b"glTF" + struct.pack("<II", 2, 12 + len(body)) + body


def bake_file(path: Path):
    chunks, json_index, bin_index, document = parse_glb(path)
    asset_extras = document.setdefault("asset", {}).setdefault("extras", {})
    if asset_extras.get("aoBakedIntoAlbedo"):
        print(f"• {path.name}: AO already baked")
        return

    images_by_name = {image.get("name"): image for image in document.get("images", [])}
    ao_entry = images_by_name.get(AO_NAME)
    if not ao_entry:
        raise ValueError(f"{path.name} has no {AO_NAME} image")
    binary = chunks[bin_index][1]
    with Image.open(io.BytesIO(image_bytes(document, binary, ao_entry))) as source:
        ao_image = source.copy()

    replacements = {}
    for name in ALBEDO_NAMES:
        image = images_by_name.get(name)
        if not image:
            raise ValueError(f"{path.name} has no {name} image")
        replacements[image["bufferView"]] = bake_albedo(image_bytes(document, binary, image), ao_image)
        image.setdefault("extras", {})["aoBaked"] = True

    new_binary = rebuild_binary(document, binary, replacements)
    asset_extras["aoBakedIntoAlbedo"] = {
        "source": AO_NAME,
        "strength": AO_STRENGTH,
        "colorSpace": "linear",
    }
    output = encode_glb(chunks, json_index, bin_index, document, new_binary)
    temporary = path.with_suffix(path.suffix + ".tmp")
    temporary.write_bytes(output)
    os.replace(temporary, path)
    print(f"✓ {path.name}: AO baked into {len(ALBEDO_NAMES)} skin albedos")


def main():
    inputs = tuple(Path(value).resolve() for value in sys.argv[1:]) or DEFAULT_ASSETS
    for asset in inputs:
        bake_file(asset)


if __name__ == "__main__":
    main()
