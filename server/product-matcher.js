import { GPC } from '../mongodb.js';

export async function matchProduct(productDescription) {
  try {
    // Step 1: Identify categories
    const categories = await GPC.distinct('category');
    const matchedCategories = categories.filter(category =>
      productDescription.toLowerCase().includes(category.toLowerCase())
    );

    if (matchedCategories.length === 0) {
      return null;
    }

    // Step 2: Determine code descriptions within matched categories
    const matchedRecords = await GPC.find({
      category: { $in: matchedCategories }
    });

    const matchedCodeDescriptions = matchedRecords
      .filter(record => productDescription.toLowerCase().includes(record.codeDescription.toLowerCase()))
      .map(record => record.codeDescription);

    if (matchedCodeDescriptions.length === 0) {
      return null;
    }

    // Step 3: Choose the most suitable code definition
    const finalCandidates = matchedRecords.filter(record =>
      matchedCategories.includes(record.category) && matchedCodeDescriptions.includes(record.codeDescription)
    );

    // Step 4: Select the best match based on code definition
    const bestMatch = finalCandidates.reduce((best, current) => {
      const currentScore = calculateDefinitionScore(productDescription, current.codeDefinition);
      const bestScore = best ? calculateDefinitionScore(productDescription, best.codeDefinition) : -1;
      return currentScore > bestScore ? current : best;
    }, null);

    return bestMatch ? bestMatch.code : null;
  } catch (error) {
    console.error('Error in matchProduct:', error);
    return null;
  }
}

function calculateDefinitionScore(productDescription, codeDefinition) {
  const descriptionWords = productDescription.toLowerCase().split(/\s+/);
  const definitionWords = codeDefinition.toLowerCase().split(/\s+/);
  
  return definitionWords.reduce((score, word) => {
    return descriptionWords.includes(word) ? score + 1 : score;
  }, 0);
}