// @flow
import * as React from "react";

type Props = {
  size?: number,
  fill?: string,
  className?: string,
};

function SlackLogo({ size = 34, fill = "#FFF", className }: Props) {
  return (
    <svg
      fill={fill}
      width={size}
      height={size}
      viewBox="0 0 34 34"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      <g stroke="none" strokeWidth="1" fillRule="evenodd">
        <g transform="translate(0.000000, 17.822581)">
          <path d="M7.23870968,3.61935484 C7.23870968,5.56612903 5.6483871,7.15645161 3.7016129,7.15645161 C1.75483871,7.15645161 0.164516129,5.56612903 0.164516129,3.61935484 C0.164516129,1.67258065 1.75483871,0.0822580645 3.7016129,0.0822580645 L7.23870968,0.0822580645 L7.23870968,3.61935484 Z" />
          <path d="M9.02096774,3.61935484 C9.02096774,1.67258065 10.6112903,0.0822580645 12.5580645,0.0822580645 C14.5048387,0.0822580645 16.0951613,1.67258065 16.0951613,3.61935484 L16.0951613,12.4758065 C16.0951613,14.4225806 14.5048387,16.0129032 12.5580645,16.0129032 C10.6112903,16.0129032 9.02096774,14.4225806 9.02096774,12.4758065 C9.02096774,12.4758065 9.02096774,3.61935484 9.02096774,3.61935484 Z" />
        </g>
        <g>
          <path d="M12.5580645,7.23870968 C10.6112903,7.23870968 9.02096774,5.6483871 9.02096774,3.7016129 C9.02096774,1.75483871 10.6112903,0.164516129 12.5580645,0.164516129 C14.5048387,0.164516129 16.0951613,1.75483871 16.0951613,3.7016129 L16.0951613,7.23870968 L12.5580645,7.23870968 Z" />
          <path d="M12.5580645,9.02096774 C14.5048387,9.02096774 16.0951613,10.6112903 16.0951613,12.5580645 C16.0951613,14.5048387 14.5048387,16.0951613 12.5580645,16.0951613 L3.7016129,16.0951613 C1.75483871,16.0951613 0.164516129,14.5048387 0.164516129,12.5580645 C0.164516129,10.6112903 1.75483871,9.02096774 3.7016129,9.02096774 C3.7016129,9.02096774 12.5580645,9.02096774 12.5580645,9.02096774 Z" />
        </g>
        <g transform="translate(17.822581, 0.000000)">
          <path d="M8.93870968,12.5580645 C8.93870968,10.6112903 10.5290323,9.02096774 12.4758065,9.02096774 C14.4225806,9.02096774 16.0129032,10.6112903 16.0129032,12.5580645 C16.0129032,14.5048387 14.4225806,16.0951613 12.4758065,16.0951613 L8.93870968,16.0951613 L8.93870968,12.5580645 Z" />
          <path d="M7.15645161,12.5580645 C7.15645161,14.5048387 5.56612903,16.0951613 3.61935484,16.0951613 C1.67258065,16.0951613 0.0822580645,14.5048387 0.0822580645,12.5580645 L0.0822580645,3.7016129 C0.0822580645,1.75483871 1.67258065,0.164516129 3.61935484,0.164516129 C5.56612903,0.164516129 7.15645161,1.75483871 7.15645161,3.7016129 L7.15645161,12.5580645 Z" />
        </g>
        <g transform="translate(17.822581, 17.822581)">
          <path d="M3.61935484,8.93870968 C5.56612903,8.93870968 7.15645161,10.5290323 7.15645161,12.4758065 C7.15645161,14.4225806 5.56612903,16.0129032 3.61935484,16.0129032 C1.67258065,16.0129032 0.0822580645,14.4225806 0.0822580645,12.4758065 L0.0822580645,8.93870968 L3.61935484,8.93870968 Z" />
          <path d="M3.61935484,7.15645161 C1.67258065,7.15645161 0.0822580645,5.56612903 0.0822580645,3.61935484 C0.0822580645,1.67258065 1.67258065,0.0822580645 3.61935484,0.0822580645 L12.4758065,0.0822580645 C14.4225806,0.0822580645 16.0129032,1.67258065 16.0129032,3.61935484 C16.0129032,5.56612903 14.4225806,7.15645161 12.4758065,7.15645161 L3.61935484,7.15645161 Z" />
        </g>
      </g>
    </svg>
  );
}

export default SlackLogo;
