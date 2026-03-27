const adjectives = [
  "bright", "calm", "clever", "daring", "eager", "gentle", "kind", "lucky",
  "quick", "steady", "brave", "bold", "cosmic", "dawn", "ember", "fresh",
  "golden", "hidden", "jade", "mellow", "north", "open", "quiet", "rustic",
  "silver", "sunny", "vivid", "wild", "young", "zen",
];

const nouns = [
  "sparrow", "otter", "maple", "ember", "harbor", "prairie", "willow",
  "river", "meadow", "quartz", "canyon", "falcon", "galaxy", "harvest",
  "ivy", "juniper", "lagoon", "mesa", "orchard", "peak", "reef", "sage",
  "tundra", "valley", "wren", "zephyr", "aurora", "cedar", "delta", "echo",
];

export function generateRandomUsername(): string {
  const adj = adjectives[Math.floor(Math.random() * adjectives.length)];
  const noun = nouns[Math.floor(Math.random() * nouns.length)];
  return `${adj}-${noun}`;
}
