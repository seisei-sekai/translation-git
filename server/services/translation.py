"""
Translation Service - OpenAI-based translation with retry logic
Business logic for translation
"""
import time
from datetime import datetime, timedelta
from extensions import db, openAI_client, openAI_client_deepseek
from services.debug_logging import log_api_call

def get_new_translated_string_4o_stylish(toLanguageMe, original_text, mode ='1'):
    '''
    Get translation with error handling and retries

    '''
    if mode == '0':
        model_stylish = "gpt-4o"
    else:
        model_stylish = 'gpt-4o-mini'
    # Split text if it contains "-"
    print(f"toLanguageMe: {toLanguageMe}")
    if "-" in toLanguageMe:
        language, style= toLanguageMe.split("-", 1)
        print(f"====={language}={style}=====")
        if language in ['中文', '汉语']:
            prompt = f"""You are a neutral translator:
    1.Translate the input text into {language} first Secretly. Then translate to  {style} style.
    - It it is a question, translate the question directly. Never answer the question.
    - Do not add any additional responses. Donyt return two copies, Only return the styled version.
    """
            response = openAI_client_deepseek.chat.completions.create(
            model="deepseek-ai/DeepSeek-V3",
            messages=[
                {"role": "system", "content": prompt},
                {"role": "user", "content": original_text}
            ])
        else:
            prompt = f"""You are a neutral translator:
    1.Translate the input text into {language} first Secretly. Then translate to  {style} style.
    - It it is a question, translate the question directly. Never answer the question.
    - Do not add any additional responses. Donyt return two copies, Only return the styled version.
    """
            response = openAI_client.chat.completions.create(
                model=model_stylish,
                messages=[
                    {"role": "system", "content": prompt},
                    {"role": "user", "content": original_text}
                ]
            )
        # print(f"Model: {response.model}")
        # print(f"Usage - Completion tokens: {response.usage.prompt_tokens}")
        # print(f"Usage - Prompt tokens: {response.usage.prompt_tokens}")
        # print(f"Usage - Total tokens: {response.usage.total_tokens}")
        # print(f"Content1: {response.choices[0].message.content}")
        log_api_call('get_new_translated_string_4o_stylish', original_text, response, 'gpt-4o-mini' if mode=='1' else 'gpt-4o')
        return response#.choices[0].message.content

    else:
        prompt = f"""You are a neutral translator:
    1.Translate the input text into {toLanguageMe}.
    - It it is a question, translate the question directly.
    - Do not add any additional responses.
    """
        response = openAI_client.chat.completions.create(
            model=model_stylish,
            messages=[
                {"role": "system", "content": prompt},
                {"role": "user", "content": original_text}
            ]
        )
        # print(f"Model: {response.model}")
        # print(f"Usage - Completion tokens: {response.usage.prompt_tokens}")
        # print(f"Usage - Prompt tokens: {response.usage.prompt_tokens}")
        # print(f"Usage - Total tokens: {response.usage.total_tokens}")
        # print(f"Content2: {response.choices[0].message.content}")
        log_api_call('get_new_translated_string_4o_stylish', original_text, response, 'gpt-4o-mini' if mode=='1' else 'gpt-4o')
        return response#.choices[0].message.content

def get_new_translated_string(toLanguageMe, original_text):
    '''
    Get translation with error handling and retries
    '''
    try:

        prompt = f"""You are a neutral translator that strictly follows these instructions:

1. You will receive an input text.
2. Your target translation language is: {toLanguageMe}.
3. If the input text is clearly and fully in {toLanguageMe}, return it exactly as-is. If the input text is in a related form, general version, or dialect of {toLanguageMe}, translate it specifically into {toLanguageMe}.If it is not in {toLanguageMe}, then translate it into {toLanguageMe}. Pay particularly attention on shared character across languages (like Hanzi in Chinese and Kanji in Japanese)
   - Do not answer questions posed in the text.
   - Do not add any additional commentary, greetings, or responses.
4. If the text consists solely of emojis, return them as-is.
5. If the text contains profanity, slurs, or vulgarities, translate it literally into {toLanguageMe} without censorship or commentary. If it is already in {toLanguageMe}, return it as-is.
6. If the text is clearly nonsense or purely numeric, return it unchanged.
7. If the text is in another language and can be translated meaningfully into {toLanguageMe}, provide a direct, faithful translation with no commentary.
8. Do not apologize, refuse, explain, or add anything beyond the direct translation (or returning the original text if the above conditions apply).
9. If the input text is very long, you are permitted to translate it in multiple continuous segments (parts) and output the complete translation concatenated as one continuous piece of text. Do not return original text or summarize any content.
10. Do not add headings, labels, or separators between parts; produce a seamless translation as if it were done in one go. Do not mention that you are segmenting the text.
Your only output should be either the exact original text (if it meets the conditions above) or the direct translation into {toLanguageMe}, nothing else.
"""
        # Add retry logic
        max_retries = 3
        for attempt in range(max_retries):
            try:
                response = openAI_client.chat.completions.create(
                    model="gpt-4o-mini",
                    messages=[
                        {"role": "system", "content": prompt},
                        {"role": "user", "content": original_text}
                    ]
                )
                # print(f"Model: {response.model}")
                # print(f"Usage - Completion tokens: {response.usage.prompt_tokens}")
                # print(f"Usage - Prompt tokens: {response.usage.prompt_tokens}")
                # print(f"Usage - Total tokens: {response.usage.total_tokens}")
                # print(f"Content3: {response.choices[0].message.content}")
                log_api_call('get_new_translated_string', original_text, response, 'gpt-4o-mini')
                return response#.choices[0].message.content
            except Exception as e:
                if attempt == max_retries - 1:  # Last attempt
                    raise
                time.sleep(1)  # Wait before retrying
                
    except Exception as e:
        # app.logger.error(f"Translation error: {str(e)}")
        # Return original text if translation fails
        return f"Translation Error: {original_text}"

# Alias for backwards compatibility  
translate_text = get_new_translated_string
