// -----------------------------------------------------------------------------
// ExcalidrawImageElement & related helpers
// -----------------------------------------------------------------------------

import { MIME_TYPES, SVG_NS } from "@excalidraw/common";

import type {
  AppClassProperties,
  DataURL,
  BinaryFiles,
  AppProps,
  FileEventResolver,
  EventResolver,
  BinaryFileData,
} from "@excalidraw/excalidraw/types";

import { isInitializedImageElement } from "./typeChecks";

import type {
  ExcalidrawElement,
  FileId,
  InitializedExcalidrawImageElement,
} from "./types";

const isInlineDataUrl = (value: string): boolean => {
  return typeof value === "string" && value.startsWith("data:");
};

const isBlobUrl = (value: string): boolean => {
  return typeof value === "string" && value.startsWith("blob:");
};

const blobToDataUrl = async (blob: Blob): Promise<DataURL> => {
  return new Promise<DataURL>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as DataURL);
    reader.onerror = (error) => reject(error);
    reader.readAsDataURL(blob);
  });
};

const normalizeFileDataUrlForCanvas = async (
  fileData: BinaryFileData,
): Promise<BinaryFileData> => {
  const src = fileData?.dataURL;
  if (!src || isInlineDataUrl(src) || isBlobUrl(src)) {
    return fileData;
  }

  try {
    const response = await fetch(src, {
      // Stable upload URLs authenticate on the same-origin app route and may
      // redirect to a signed object host that does not allow credentialed CORS.
      credentials: "same-origin",
    });

    if (!response.ok) {
      return fileData;
    }

    const blob = await response.blob();
    const dataURL = await blobToDataUrl(blob);

    return {
      ...fileData,
      dataURL,
      mimeType:
        fileData.mimeType === MIME_TYPES.binary
          ? ((blob.type || MIME_TYPES.png) as BinaryFileData["mimeType"])
          : fileData.mimeType,
    };
  } catch {
    return fileData;
  }
};

export const loadHTMLImageElement = (
  dataURL: DataURL,
  onError?: EventResolver,
) => {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();

    try {
      if (!isInlineDataUrl(dataURL) && !isBlobUrl(dataURL)) {
        image.crossOrigin = "anonymous";
      }
    } catch {
      // no-op
    }

    image.onload = () => {
      resolve(image);
    };
    image.onerror = onError
      ? (error) => onError(error, resolve, reject)
      : (error) => {
          reject(error);
        };
    image.src = dataURL;
  });
};

/** NOTE: updates cache even if already populated with given image. Thus,
 * you should filter out the images upstream if you want to optimize this. */
export const updateImageCache = async ({
  fileIds,
  files,
  imageCache,
  resolveFileUrl,
  onFileUrlError,
}: {
  fileIds: FileId[];
  files: BinaryFiles;
  imageCache: AppClassProperties["imageCache"];
  resolveFileUrl?: AppProps["resolveFileUrl"];
  onFileUrlError?: FileEventResolver;
}) => {
  const updatedFiles = new Map<FileId, true>();
  const erroredFiles = new Map<FileId, true>();
  const resolvedFiles = new Map<FileId, BinaryFileData>();

  // if resolveFileUrl is provided, use it to build files object
  if (resolveFileUrl) {
    files = Object.fromEntries(
      (
        await Promise.all(
          fileIds.map(async (fileId) => {
            const fileData = files[fileId] ?? (await resolveFileUrl(fileId));
            if (fileData) {
              resolvedFiles.set(fileId, fileData);
              return [fileId, fileData];
            }
            return null;
          }),
        )
      ).filter((entry): entry is [FileId, BinaryFileData] => entry !== null),
    );
  }

  await Promise.all(
    fileIds.reduce((promises, fileId) => {
      const fileData = files[fileId as string];
      if (fileData && !updatedFiles.has(fileId)) {
        updatedFiles.set(fileId, true);
        return promises.concat(
          (async () => {
            try {
              const normalizedFileData = await normalizeFileDataUrlForCanvas(
                fileData,
              );

              if (normalizedFileData !== fileData) {
                files[fileId] = normalizedFileData;
                resolvedFiles.set(fileId, normalizedFileData);
              }

              if (normalizedFileData.mimeType === MIME_TYPES.binary) {
                throw new Error("Only images can be added to ImageCache");
              }

              const imagePromise = loadHTMLImageElement(
                (normalizedFileData.dataURL ?? fileData.dataURL) as DataURL,
                onFileUrlError
                  ? (e, resolve, reject) =>
                      onFileUrlError(fileId, e, resolve, reject)
                  : undefined,
              );

              const data = {
                image: imagePromise,
                mimeType: normalizedFileData.mimeType,
              } as const;
              // store the promise immediately to indicate there's an in-progress
              // initialization
              imageCache.set(fileId, data);

              const image = await imagePromise;

              imageCache.set(fileId, { ...data, image });
            } catch (error: any) {
              erroredFiles.set(fileId, true);
            }
          })(),
        );
      }
      return promises;
    }, [] as Promise<any>[]),
  );

  return {
    imageCache,
    /** includes errored files because they cache was updated nonetheless */
    updatedFiles,
    /** files that failed when creating HTMLImageElement */
    erroredFiles,
    /** files that were resolved via cache/memory or resolveFileUrl */
    resolvedFiles,
  };
};

export const getInitializedImageElements = (
  elements: readonly ExcalidrawElement[],
) =>
  elements.filter((element) =>
    isInitializedImageElement(element),
  ) as InitializedExcalidrawImageElement[];

export const isHTMLSVGElement = (node: Node | null): node is SVGElement => {
  // lower-casing due to XML/HTML convention differences
  // https://johnresig.com/blog/nodename-case-sensitivity
  return node?.nodeName.toLowerCase() === "svg";
};

export const normalizeSVG = (SVGString: string) => {
  const doc = new DOMParser().parseFromString(SVGString, MIME_TYPES.svg);
  const svg = doc.querySelector("svg");
  const errorNode = doc.querySelector("parsererror");
  if (errorNode || !isHTMLSVGElement(svg)) {
    throw new Error("Invalid SVG");
  } else {
    if (!svg.hasAttribute("xmlns")) {
      svg.setAttribute("xmlns", SVG_NS);
    }

    let width = svg.getAttribute("width");
    let height = svg.getAttribute("height");

    // Do not use % or auto values for width/height
    // to avoid scaling issues when rendering at different sizes/zoom levels
    if (width?.includes("%") || width === "auto") {
      width = null;
    }
    if (height?.includes("%") || height === "auto") {
      height = null;
    }

    const viewBox = svg.getAttribute("viewBox");

    if (!width || !height) {
      width = width || "50";
      height = height || "50";

      if (viewBox) {
        const match = viewBox.match(
          /\d+ +\d+ +(\d+(?:\.\d+)?) +(\d+(?:\.\d+)?)/,
        );
        if (match) {
          [, width, height] = match;
        }
      }

      svg.setAttribute("width", width);
      svg.setAttribute("height", height);
    }

    // Make sure viewBox is set
    if (!viewBox) {
      svg.setAttribute("viewBox", `0 0 ${width} ${height}`);
    }

    return svg.outerHTML;
  }
};
