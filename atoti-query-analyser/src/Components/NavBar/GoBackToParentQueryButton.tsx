import React from "react";

// callback will be changeGraph()
/**
 * This React component shows a button to go to the parent query if exists.
 * */
export function GoBackToParentQueryButton(
  currentParentId: number | null,
  callback: (id: number) => void
) {
  if (currentParentId !== null) {
    return (
      <input
        className="btn btn-outline-light ml-3"
        type="button"
        value="Go Back To Parent Query"
        onClick={() => callback(currentParentId)}
      />
    );
  }
  return <></>;
}
