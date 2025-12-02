import React from "react";
import TextPressure from "./TextPressure";

export default function AITextPressure({ text }) {
  if (!text) return null;

  return (
    <div
      style={{
        position: "relative",
        width: "100%",
        minHeight: "120px",
        marginTop: "10px",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <TextPressure
        text={text}
        flex={true}
        alpha={false}
        stroke={false}
        width={true}
        weight={true}
        italic={true}
        textColor="#ffffff"
        strokeColor="#ff0000"
        minFontSize={22}
      />
    </div>
  );
}
