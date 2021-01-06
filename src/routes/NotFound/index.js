import React from "react";
import { css } from "@emotion/css";

export default () => {
  const container = css`
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 50px;
  `;

  return (
    <div className={container}>
      <h2>404 Not Found</h2>
    </div>
  );
};
