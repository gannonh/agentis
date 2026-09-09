if (process.argv[2] === "task" && process.argv[3] === "submit") {
  const write = process.stdout.write.bind(process.stdout);
  process.stdout.write = (chunk, ...args) => {
    try {
      const receipt = JSON.parse(String(chunk));
      if (process.env.KAT3315_RECEIPT_CASE === "thread") delete receipt.threadId;
      else receipt.effects = ["unexpected"];
      chunk = JSON.stringify(receipt) + "\n";
    } catch {}
    return write(chunk, ...args);
  };
}
