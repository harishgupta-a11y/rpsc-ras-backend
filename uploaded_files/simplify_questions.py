import os
import sys
import json
import re
from google import genai
from google.genai import types

# Setup client using your portable environment
api_key = os.environ.get("GEMINI_API_KEY", "")
if not api_key:
    # Try reading from your credential system files or environment
    print("Warning: GEMINI_API_KEY is not set. Please set it to proceed with AI extraction.")
    sys.exit(1)

client = genai.Client(api_key=api_key)

raw_path = "C:/Users/aNKIT/.gemini/antigravity/scratch/rpsc-ras-app/backend/uploaded_files/questions_raw.txt"
out_path = "C:/Users/aNKIT/.gemini/antigravity/scratch/rpsc-ras-app/backend/uploaded_files/questions_clean.txt"

print(f"Reading raw questions from: {raw_path}")
with open(raw_path, 'r', encoding='utf-8') as f:
    raw_content = f.read()

# Separate questions using the Q. split pattern
raw_blocks = re.split(r'\n+(?=Q\.)', raw_content)
print(f"Total raw blocks loaded: {len(raw_blocks)}")

cleaned_questions = []

# Process in chunks of 5 questions to maintain high precision and avoid context limits
chunk_size = 5
for i in range(0, len(raw_blocks), chunk_size):
    chunk = raw_blocks[i:i+chunk_size]
    chunk_text = "\n\n=== NEW BLOCK ===\n\n".join(chunk)
    
    print(f"Processing chunk {i // chunk_size + 1} ({i+1} to {min(i+chunk_size, len(raw_blocks))})...")
    
    prompt = f"""You are an elite expert proofreader and editor for RPSC RAS exam materials. 
I have a set of questions that look AI-generated (overly verbose, unnatural phrasing, containing unnecessary academic fluff).

Your job is to rewrite them to look strictly human-made and clear, while respecting the following guidelines:
1. Shorten the questions: Remove all verbose AI fluff. Keep them direct, punchy, and natural.
2. Zero Summarization: Do not omit or change any micro-facts, coordinate numbers, historical dates (e.g. 646 AD), or committee/dynasty/ruler/place names.
3. Keep the sequence: Maintain the exact sequence of questions.
4. Correctness: Verify each question's facts against standard history. Correct any factual errors.
5. Format match type questions: If you find any match-the-following style questions, convert the columns into a clean markdown table form (do NOT use ASCII border symbols or code characters for lines).
6. Explanations in point form: Convert paragraph explanations into a clean list of bullet points (e.g., "- Point 1\\n- Point 2") for readability.
7. Output format: Keep the exact pattern of the input blocks (Q., options A/B/C/D, Correct: [Answer], Explanation: [Bullets]).

Here is the chunk to edit:
{chunk_text}

Provide ONLY the cleaned, human-like questions in the same order. Do not write any markdown code fences, headers, or conversational text."""

    try:
        response = client.models.generate_content(
            model='gemini-2.0-flash',
            contents=prompt
        )
        cleaned_chunk = response.text.strip()
        cleaned_questions.append(cleaned_chunk)
    except Exception as e:
        print(f"Error on chunk starting at {i}: {e}")

# Save the final cleaned output
final_text = "\n\n".join(cleaned_questions)
# Remove potential double newlines/cleanup spacing
final_text = re.sub(r'\n{3,}', '\n\n', final_text)

with open(out_path, 'w', encoding='utf-8') as f:
    f.write(final_text)

print(f"Successfully wrote cleaned questions to: {out_path}")
