import classes from './App.module.scss';
import React from 'react';
import { Button, FileInput } from '@blueprintjs/core';
import ReactCrop, { Crop } from 'react-image-crop';
import byteSize from 'byte-size';
import imageCompression from 'browser-image-compression';
import { getCanvasBlob } from './utils';

const App: React.FC = () => {
  const [crop, setCrop] = React.useState<Crop>();
  const [croppedSize, setCroppedSize] = React.useState<number | null>(null);
  const [file, setFile] = React.useState<File | null>(null);
  const [compressedFile, setCompressedFile] = React.useState<File | null>(null);
  const imgRef = React.useRef<HTMLImageElement | null>(null);
  const fileInputRef = React.useRef<FileInput | null>(null);
  const [canvas, setCanvas] = React.useState<HTMLCanvasElement | null>(null);
  const [imgSrc, setImgSrc] = React.useState('');

  const handleSelectFile = React.useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files && e.target.files?.length > 0) {
        setCrop(undefined);
        const reader = new FileReader();
        reader.addEventListener('load', () => {
          if (reader.result) {
            setImgSrc(reader.result.toString() || '');
          }
        });
        const file = e.target.files[0];
        const compressedFile = await imageCompression(file, {
          useWebWorker: true,
        });
        setFile(file);
        setCompressedFile(compressedFile);
        reader.readAsDataURL(compressedFile);
      }
    },
    [],
  );

  const handleReset = React.useCallback(() => {
    setCrop(undefined);
    setCanvas(null);
    setFile(null);
    setCompressedFile(null);
    setImgSrc('');
    setCroppedSize(null);
  }, []);

  React.useEffect(() => {
    handleReset();
  }, []);

  React.useEffect(() => {
    if (!crop?.width || !crop.height) {
      setCroppedSize(null);
      return;
    }
    if (canvas) {
      (async () => {
        const blob = await getCanvasBlob(canvas);
        if (blob) {
          setCroppedSize(blob.size);
        }
      })();
    }
  }, [canvas, crop]);

  const handleComplete = ({ x, y, width, height }: Crop) => {
    if (imgRef.current && crop?.width && crop.height) {
      const imgCanvas = document.createElement('canvas');
      imgCanvas.height = imgRef.current.height;
      imgCanvas.width = imgRef.current.width;
      const imgCanvasCtx = imgCanvas.getContext('2d');
      if (!imgCanvasCtx) {
        return;
      }
      imgCanvasCtx.drawImage(
        imgRef.current,
        0,
        0,
        imgCanvas.width,
        imgCanvas.height,
      );
      const imgData = imgCanvasCtx.getImageData(x, y, width, height);
      const cropCanvas = document.createElement('canvas');
      cropCanvas.height = crop.height;
      cropCanvas.width = crop.width;
      const cropCanvasCtx = cropCanvas.getContext('2d');
      if (!cropCanvasCtx) {
        return;
      }
      cropCanvasCtx.putImageData(imgData, 0, 0);
      setCanvas(cropCanvas);
    }
  };

  const handleDownload = () => {
    if (file && canvas) {
      const link = document.createElement('a');
      link.download = `cropped_${file.name}`;
      link.href = canvas.toDataURL();
      link.click();
    }
  };

  const handleInputClick = React.useCallback(
    (event: React.MouseEvent<HTMLLabelElement, MouseEvent>) => {
      const target = event.target as HTMLInputElement;
      target.value = '';
    },
    [],
  );

  return (
    <div className={classes.App}>
      <FileInput
        fill
        ref={fileInputRef}
        text="Choose file..."
        onClick={handleInputClick}
        onInputChange={handleSelectFile}
      />
      <div className={classes.Crop}>
        {imgSrc && (
          <ReactCrop
            aspect={1}
            crop={crop}
            onChange={(c) => setCrop(c)}
            onComplete={handleComplete}
          >
            <img src={imgSrc} ref={imgRef} alt="*" />
          </ReactCrop>
        )}
      </div>
      <div>{file && <>Original size: {byteSize(file.size).toString()}</>}</div>
      <div>
        {compressedFile && (
          <>Compressed size: {byteSize(compressedFile.size).toString()}</>
        )}
      </div>
      <div>
        {croppedSize && (
          <>Cropped & compressed size: {byteSize(croppedSize).toString()}</>
        )}
      </div>
      <div className={classes.Download}>
        <Button
          large
          intent="primary"
          disabled={(!crop?.width || !crop?.height) && !canvas}
          onClick={handleDownload}
        >
          Download
        </Button>{' '}
        <Button large onClick={handleReset}>
          Reset
        </Button>
      </div>
    </div>
  );
};

export default App;
