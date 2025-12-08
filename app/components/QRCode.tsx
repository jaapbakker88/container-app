import type { ContainerType } from "~/types/definitions";

function QRCode({
  container,
  containerUrl,
}: {
  container: ContainerType;
  containerUrl: string;
}) {
  const qrSrc = `https://api.qrserver.com/v1/create-qr-code/?size=240x240&data=${encodeURIComponent(
    containerUrl
  )}`;
  return (
    <div className="mt-8">
      <h2 className="text-xl font-bold mb-1">{container.code}</h2>
      <img
        src={qrSrc}
        alt={`QR code for ${containerUrl}`}
        className="w-full mt-4"
      />
    </div>
  );
}

export default QRCode;
