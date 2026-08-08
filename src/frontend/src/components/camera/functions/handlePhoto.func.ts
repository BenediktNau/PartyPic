export const handlePhotoShoot = (base64Image: string, sessionId: string) => {
    const blob = dataURLtoBlob(base64Image);
    console.log(sessionId);
    const fileName = (new Date().toISOString()).split(".")[0] + ".jpg";
    return { blob, fileName };
}




//AUTHOR: GEMINI
function dataURLtoBlob(dataurl: string): Blob {
    const arr = dataurl.split(',');
    if (arr.length < 2) {
        throw new Error('Invalid data URL');
    }

    const mimeMatch = arr[0].match(/:(.*?);/);
    if (!mimeMatch || mimeMatch.length < 2) {
        throw new Error('Could not parse MIME type');
    }
    const mime = mimeMatch[1];

    const bstr = atob(arr[1]); // Dekodiert Base64
    let n = bstr.length;
    const u8arr = new Uint8Array(n); // Erstellt ein Array für die Binärdaten

    while (n--) {
        u8arr[n] = bstr.charCodeAt(n);
    }

    return new Blob([u8arr], { type: mime });
}