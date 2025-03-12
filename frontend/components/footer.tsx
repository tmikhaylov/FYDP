// app/components/footer.tsx

/**
 * The Footer Component provides additional functionalities
 * such as feedback submission and other actions.
 *
 * Final Design Description:
 * - Feedback Button: Allows users to provide feedback on their experience.
 * - Additional Actions: Includes buttons for other functionalities like help,
 *   support, or settings shortcuts.
 */

export default function Footer() {
    return (
      <div className="mt-2 flex items-center justify-center gap-4 text-xs text-gray-500 dark:text-gray-400">
        <span className="text-center">
          ScanKit can make mistakes. Check important info.
        </span>
        <button type="button" className="underline">
          Feedback
        </button>
        <button type="button" className="underline">
          Help
        </button>
      </div>
    );
  }
  