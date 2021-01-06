import { css } from "@emotion/css";

const container = css`
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 10px;
`;

const videoContainer = css`
  display: flex;
  padding: 10px;
  align-items: baseline;
  > video {
    background-color: #fcce66;
    border: 3px solid #4caf50;
    border-radius: 20px;
    margin: 5px;
  }
  > video:nth-child(1) {
    width: 35vw;
    height: 50vh;
  }
  > video:last-child {
    height: 20vh;
    // height: 135px;
  }
`;

const callControls = css`
  margin: 10px 0;
  > span {
    font-size: 10pt;
  }
  > button {
    background-color: #2f55b5;
    color: white;
    height: 30px;
    border: none;
    border-radius: 5px;
    margin: 0 5px;
    &:hover {
      cursor: pointer;
      border: 0.7px solid #2f55b5;
      background-color: white;
      color: #2f55b5;
    }
  }
  > input {
    height: 30px;
    border: 0.5px solid #efefef;
    border-radius: 5px;
    width: 100px;
  }
`;

export { container, videoContainer, callControls };
