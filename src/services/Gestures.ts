import * as fp from 'fingerpose';

// --- Closed Fist (Default Play Mode) ---
export const FistGesture = new fp.GestureDescription('fist');

// All fingers curled
// Thumb can be half curled or full
FistGesture.addCurl(fp.Finger.Thumb, fp.FingerCurl.HalfCurl, 1.0);
FistGesture.addCurl(fp.Finger.Thumb, fp.FingerCurl.FullCurl, 1.0);

for (let finger of [fp.Finger.Index, fp.Finger.Middle, fp.Finger.Ring, fp.Finger.Pinky]) {
    FistGesture.addCurl(finger, fp.FingerCurl.FullCurl, 1.0);
    FistGesture.addCurl(finger, fp.FingerCurl.HalfCurl, 0.9);
}

// --- Open Palm (Activate Power-Up) ---
export const OpenPalmGesture = new fp.GestureDescription('open_palm');

// All fingers straight
for (let finger of [fp.Finger.Thumb, fp.Finger.Index, fp.Finger.Middle, fp.Finger.Ring, fp.Finger.Pinky]) {
    OpenPalmGesture.addCurl(finger, fp.FingerCurl.NoCurl, 1.0);
}
