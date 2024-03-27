
export const MARSHALL_OPTIONS = {
	// Whether to automatically convert empty strings, blobs, and sets to `null`.
	convertEmptyValues: false, // false, by default.
	// Whether to remove undefined values while marshalling.
	removeUndefinedValues: true, // false, by default.
	// Whether to convert typeof object to map attribute.
	convertClassInstanceToMap: true, // false, by default.
};

export const UNMARSHALL_OPTIONS = {
	// Whether to return numbers as a string instead of converting them to native JavaScript numbers.
	wrapNumbers: false, // false, by default.
};
