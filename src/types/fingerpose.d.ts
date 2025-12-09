declare module 'fingerpose' {
    export class GestureEstimator {
        constructor(gestures: any[]);
        estimate(landmarks: number[][], minScore: number): {
            gestures: { name: string; score: number }[];
        };
    }
    export class GestureDescription {
        constructor(name: string);
        addCurl(finger: number, curl: number, contribution: number): void;
        addDirection(finger: number, direction: number, contribution: number): void;
    }
    export const Finger: {
        Thumb: number;
        Index: number;
        Middle: number;
        Ring: number;
        Pinky: number;
    };
    export const FingerCurl: {
        NoCurl: number;
        HalfCurl: number;
        FullCurl: number;
    };
    export const FingerDirection: {
        VerticalUp: number;
        VerticalDown: number;
        HorizontalLeft: number;
        HorizontalRight: number;
        DiagonalUpRight: number;
        DiagonalUpLeft: number;
        DiagonalDownRight: number;
        DiagonalDownLeft: number;
    };
    export const Gestures: {
        VictoryGesture: any;
        ThumbsUpGesture: any;
    };
}
