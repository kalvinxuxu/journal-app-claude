import { useRef, type ChangeEvent } from "react";

type ImageUploaderProps = {
  images: string[];
  maxImages?: number;
  onChange: (images: string[]) => void;
};

export function ImageUploader({ images, maxImages = 3, onChange }: ImageUploaderProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  function handleFiles(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    if (images.length >= maxImages) return;

    const reader = new FileReader();
    reader.onload = () => {
      const result = typeof reader.result === "string" ? reader.result : null;
      if (!result) return;
      onChange([...images, result].slice(0, maxImages));
    };
    reader.readAsDataURL(file);

    event.target.value = "";
  }

  function removeImage(index: number) {
    onChange(images.filter((_, currentIndex) => currentIndex !== index));
  }

  return (
    <div className="image-uploader">
      <div className="image-uploader__grid">
        {images.map((image, index) => (
          <div key={`${image}-${index}`} className="image-uploader__tile">
            <img src={image} alt={`图片 ${index + 1}`} />
            <button type="button" className="image-uploader__delete" onClick={() => removeImage(index)}>
              删除
            </button>
          </div>
        ))}

        {images.length < maxImages ? (
          <div className="image-uploader__add">
            <button
              type="button"
              className="image-uploader__button"
              aria-label="+ 添加图片"
              onClick={() => inputRef.current?.click()}
            >
              + 添加图片
            </button>
            <input ref={inputRef} type="file" accept="image/*" onChange={handleFiles} />
          </div>
        ) : null}
      </div>
      <p className="image-uploader__hint">最多 {maxImages} 张图片</p>
    </div>
  );
}
