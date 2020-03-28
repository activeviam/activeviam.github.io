import React from "react";

// callback will be changeGraph()
const goBackToParentQueryButton = (currentParentId, callback) => {
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
};

export default goBackToParentQueryButton;
