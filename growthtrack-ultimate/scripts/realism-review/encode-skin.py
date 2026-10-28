from PIL import Image
import sys
image=Image.open(sys.argv[1]).convert('RGB')
size=int(sys.argv[3])
image.thumbnail((size,size),Image.Resampling.LANCZOS)
image.save(sys.argv[2],format='JPEG',quality=90,subsampling=0,optimize=True)
