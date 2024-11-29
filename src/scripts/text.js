const crypto = require("crypto");
const removeEscapeCharacters = (raw) => {
  let text = structuredClone(raw);
  text = text.replaceAll("\r", " ");
  text = text.replaceAll("\n", " ");
  text = text.replaceAll("\t", " ");
  return text;
};

const removeParentalRating = (raw) => {
  let text = structuredClone(raw);
  text = text.replaceAll("PG13", "");
  text = text.replaceAll("NC16", "");
  text = text.replaceAll("M18", "");
  text = text.replaceAll("R21", "");
  text = text.replaceAll("PG", "");
  return text;
};

const removeSubs = (raw) => {
  let text = structuredClone(raw);
  text = text.replaceAll("English Sub", "");
  text = text.replaceAll("Eng Sub", "");
  return text;
};

const removeExcessCharacters = (raw) => {
  let text = structuredClone(raw);
  text = text.replaceAll("*", "");
  text = text.replaceAll("()", " ");
  text = text.replaceAll("  ", " ");

  text = text.trim();
  return text;
};

const removeLanguage = (raw) => {
  let text = structuredClone(raw);
  text = text.replaceAll("Tamil", "");
  text = text.replaceAll("Malayalam", "");
  text = text.replaceAll("Malay", "");
  text = text.replaceAll("(M)", "");
  text = text.replaceAll("KOR", "");
  text = text.replaceAll("CHN", "");
  return text;
};

const removeFormat = (raw) => {
  let text = structuredClone(raw);
  text = text.replaceAll("Atmos", "");
  return text;
};

const removeNonASCIICharacters = (raw) => {
  let text = structuredClone(raw);
  text = text.replaceAll(/[^\x00-\x7F]/g, "");
  return text;
};

const removeMovieDetails = (
  raw,
  chainSpecificDetails = (text) => {
    return text;
  }
) => {
  let text = structuredClone(raw);
  text = removeEscapeCharacters(text);
  text = removeNonASCIICharacters(text);
  text = removeParentalRating(text);
  text = removeSubs(text);
  text = removeLanguage(text);
  text = removeFormat(text);
  text = chainSpecificDetails(text);
  text = removeExcessCharacters(text);
  return text;
};

const cleanString = (
  raw,
  specificDetails = (text) => {
    return text;
  }
) => {
  let text = structuredClone(raw);
  text = removeEscapeCharacters(text);
  text = removeNonASCIICharacters(text);
  text = specificDetails(text);
  text = removeExcessCharacters(text);
  return text;
};

const generateStringIds = (text) => {
  let cleanText = structuredClone(text);
  cleanText = removeExcessCharacters(cleanText);
  cleanText = cleanText.trim().toLowerCase();
  return crypto.createHash("sha1").update(cleanText).digest("base64");
};

// Compute the edit distance between the two given strings
const getEditDistance = (a, b) => {
  if (a.length === 0) return b.length;
  if (b.length === 0) return a.length;

  a = a.toLowerCase().replaceAll(" ", "");
  b = b.toLowerCase().replaceAll(" ", "");

  var matrix = [];

  // increment along the first column of each row
  var i;
  for (i = 0; i <= b.length; i++) {
    matrix[i] = [i];
  }

  // increment each column in the first row
  var j;
  for (j = 0; j <= a.length; j++) {
    matrix[0][j] = j;
  }

  // Fill in the rest of the matrix
  for (i = 1; i <= b.length; i++) {
    for (j = 1; j <= a.length; j++) {
      if (b.charAt(i - 1) == a.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1, // substitution
          Math.min(
            matrix[i][j - 1] + 1, // insertion
            matrix[i - 1][j] + 1
          )
        ); // deletion
      }
    }
  }

  return matrix[b.length][a.length];
};

// cuid ?
const generateUUID = () => {
  return crypto.randomBytes(5).toString("hex");
};

module.exports = {
  removeEscapeCharacters,
  removeParentalRating,
  removeSubs,
  removeExcessCharacters,
  removeLanguage,
  removeMovieDetails,
  generateStringIds,
  getEditDistance,
  generateUUID,
  cleanString,
};
