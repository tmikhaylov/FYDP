"use client";

import { IoMdAddCircleOutline } from "react-icons/io";

export default function NewProjectButton() {
  return (
    <div className="px-7 mt-2">
      <button
        type="button"
        onClick={() => {
          // do nothing
        }}
        className="
          flex items-center gap-1
          text-sm
          text-gray-400
          px-2 py-1
          rounded
          hover:bg-gray-700
          hover:text-white
          transition-colors
        "
      >
        New project
        <IoMdAddCircleOutline className="w-5 h-5" />
      </button>
    </div>
  );
}
