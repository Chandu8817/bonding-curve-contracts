export default function ProgressBar({ progress }) {
  return (
    <div className="relative">
      <div className="overflow-hidden h-2 text-xs flex rounded-full bg-gray-200 dark:bg-gray-700">
        <div
          style={{ width: `${progress}%` }}
          className="animate-pulse shadow-none flex flex-col text-center whitespace-nowrap text-white justify-center bg-gradient-to-r from-primary-500 to-secondary-500"
        />
      </div>
      <div className="text-right mt-1">
        <span className="text-sm font-semibold inline-block text-primary-600 dark:text-primary-400">
          {progress}%
        </span>
      </div>
    </div>
  );
}
