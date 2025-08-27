
/**
 * Describes a file type
 */
type FileType = {
    /** Optional description */
    readonly description?: string,

    /**
     * Map where keys are MIME types and
     * values are an array of file extensions
     */
    readonly accept: { [mime: string]: string[] }
};

/**
 * Options for reading a file
 */
export type ReadFileOptions = {
    /** Acceptable file types */
    types?: FileType[]
};

/**
 * Options for writing a file
 */
export type WriteFileOptions = {
    /** Suggested file name */
    name?: string,

    /** Acceptable file types */
    types?: FileType[]
};
