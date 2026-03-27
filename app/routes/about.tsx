function About() {
  return (
    <div className="p-4 py-16">
      <h1 className="font-bold text-2xl mt-4">About</h1>
      <h2
        className="text-xl font-semibold text-gray-950 mt-4"
        id="why-bin-mate"
      >
        Why Bin Mate
      </h2>
      <h2
        className="text-xl font-semibold text-gray-950 mt-4"
        id="how-it-works"
      >
        How it works?
      </h2>
      <p className="mt-4">
        We've tried to keep Bin Mate as low tech as possible. We don't need a
        fancy app to help us manage this problem, that's why we designed it to
        be as frictionless as possible. This way it's easy to use, but also easy
        to help us set up new containers.
      </p>
      <ol className="mt-4 list-decimal ml-4 text-sm">
        <li>Print QR code on sticker</li>
        <li>Stick the sticker on the trash bin</li>
        <li>Scan the QR code and register the location of the bin</li>
        <li>Report full or empty</li>
      </ol>

      <p className="mt-4">
        Now everyone can scan the QR code and contribute to keeping the
        neighborhood clean, and helping your neighbors find the closest bin with
        available space.
      </p>
      <h2 className="text-xl font-semibold text-gray-950 mt-4" id="contribute">
        Contribute
      </h2>

      <h2
        className="text-xl font-semibold text-gray-950 mt-4"
        id="relevant-links"
      >
        Relevant links
      </h2>
      <ul className="list-disc ml-4 text-sm">
        <li>
          <a
            href="https://www.amsterdam.nl/afval/afvalcontainers-kaart/"
            className="text-blue-600 hover:underline"
          >
            Afvalcontainers kaart Amsterdam
          </a>
        </li>
      </ul>
    </div>
  );
}

export default About;
