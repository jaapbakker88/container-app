function StepIndicator({ current, total }: { current: number; total: number }) {
  return (
    <div className="flex items-center gap-1.5">
      {Array.from({ length: total }).map((_, i) => (
        <div
          key={i}
          className={`h-2 rounded-full transition-all duration-300 ${
            i + 1 === current
              ? "w-5 bg-blue-600 dark:bg-blue-400"
              : i + 1 < current
                ? "w-2 bg-blue-300 dark:bg-blue-700"
                : "w-2 bg-gray-200 dark:bg-gray-700"
          }`}
        />
      ))}
    </div>
  );
}

export default StepIndicator;
