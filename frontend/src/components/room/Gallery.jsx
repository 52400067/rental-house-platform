import { useEffect, useState } from "react";

/**
 * Image gallery: main photo + thumbnail strip. Owns the selected-image
 * state and resets it when the image set changes (new listing load).
 */
export default function Gallery({ images, title }) {
    const [selectedImage, setSelectedImage] = useState(0);

    useEffect(() => {
        setSelectedImage(0);
    }, [images]);

    if (images.length === 0) return null;

    return (
        <>
            <img
                src={images[selectedImage].url}
                className="img-fluid rounded-3 w-100 mb-2"
                style={{ maxHeight: 460, objectFit: "cover" }}
                alt={title}
            />
            {images.length > 1 && (
                <div className="d-flex flex-wrap gap-2 mb-4">
                    {images.map((img, i) => (
                        <img
                            key={img.id}
                            src={img.url}
                            className={`rounded-2 ${i === selectedImage ? "border border-3" : ""}`}
                            style={{
                                width: 72,
                                height: 56,
                                objectFit: "cover",
                                cursor: "pointer",
                                borderColor:
                                    i === selectedImage ? "var(--brand)" : undefined,
                            }}
                            onClick={() => setSelectedImage(i)}
                            alt=""
                        />
                    ))}
                </div>
            )}
        </>
    );
}
