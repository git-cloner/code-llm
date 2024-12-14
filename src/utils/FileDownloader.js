import JSZip from "jszip";
import FileSaver from "file-saver";

export const downloadFiles = (files) => {
    const zip = new JSZip();
    files.forEach(file => {
        zip.file(file.path, file.content);
    });

    return zip.generateAsync({ type: "blob" })
        .then(content => {
            FileSaver.saveAs(content, 'allFiles.zip');
        });
};