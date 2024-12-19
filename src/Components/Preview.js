import React, { useEffect, useImperativeHandle, forwardRef } from 'react';
import { WebContainer } from '@webcontainer/api';

const Preview = forwardRef((props, ref) => {
    let webcontainerInstance;
    const { onOutput } = props;

    useEffect(() => {
        (async () => {
            try {
                webcontainerInstance = await WebContainer.boot();
            } catch (error) {
                webcontainerInstance = undefined;
                console.log("please use https!");
            }

        })();
    }, []);

    async function execCommand(cmd) {
        const [command, ...args] = cmd.split(' ');
        if (webcontainerInstance === undefined) {
            onOutput(cmd);
            return;
        }
        const process = await webcontainerInstance.spawn(command, args);
        process.output.pipeTo(
            new WritableStream({
                write(data) {
                    onOutput(data);
                },
            }),
        );

        return process.exit;
    }

    const doPreview = (files) => {
        if (!Array.isArray(files)) {
            return;
        }
        if (files.length === 0) {
            return;
        }

        files.forEach(async ({ type, path, content }) => {
            if (type !== "bash") {
                return;
            }
            await execCommand(content);
        });

    };

    useImperativeHandle(ref, () => ({
        doPreview
    }));

    return (
        <div>
            <iframe src="preview.html" style={{ width: '100%', height: '100%', border: 'none' }}></iframe>
        </div>
    );
});

export default Preview;