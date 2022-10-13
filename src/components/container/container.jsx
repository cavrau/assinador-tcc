import { useEffect, useRef } from "react";

export default function PdfViewerComponent(props) {
const containerRef = useRef(null);

useEffect(() => {
	const container = containerRef.current;
	let instance, PSPDFKit;
	(async function() {
		PSPDFKit = await import("pspdfkit");
		instance = await PSPDFKit.load({
		// Container where PSPDFKit should be mounted.
		container,
		// The document to open.
		document: props.document,
		// Use the public directory URL as a base URL. PSPDFKit will download its library assets from here.
		baseUrl: `${window.location.protocol}//${window.location.host}/${process.env.PUBLIC_URL}`
		});

        const request = await fetch("https://www.google.com/url?sa=i&url=https%3A%2F%2Fsproutsocial.com%2Finsights%2Fsocial-media-image-sizes-guide%2F&psig=AOvVaw2CjO5TlFMWiCBO8FnHVhhB&ust=1665787333200000&source=images&cd=vfe&ved=0CAwQjRxqFwoTCKiSjMOj3voCFQAAAAAdAAAAABAE");
        const blob = await request.blob();
        const imageAttachmentId = await instance.createAttachment(blob);
        const annotation = new PSPDFKit.Annotations.ImageAnnotation({
                pageIndex: 0,
                contentType: "image/jpeg",
                imageAttachmentId,
                description: "Example Image Annotation",
                boundingBox: new PSPDFKit.Geometry.Rect({
                left: 10,
                top: 20,
                width: 150,
                height: 150,
            }),
        });
        instance.setToolbarItems([]);
	})();

	return () => PSPDFKit && PSPDFKit.unload(container);
}, []);

return (
	<div ref={containerRef} style={{ width: "100%", height: "80vh"}}/>
);
}