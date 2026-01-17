def get_new_translated_string_4o_stylish(toLanguageMe, original_text, mode ='1'):
    '''
    Get translation with error handling and retries

    '''
    if mode == '0':
        model_stylish = "gpt-4o"
    else:
        model_stylish = 'gpt-4o-mini'
    # Split text if it contains "-"
    if "-" in toLanguageMe:
        language, style= toLanguageMe.split("-", 1)
        print(f"====={language}={style}=====")
        prompt = f"""You are a neutral translator:
    1.Translate the input text into {language} first Secretly. Then translate to  {style} style.
    - It it is a question, translate the question directly. Never answer the question.
    - Do not add any additional responses.
    """
        response = openAI_client.chat.completions.create(
            model=model_stylish,
            messages=[
                {"role": "system", "content": prompt},
                {"role": "user", "content": original_text}
            ]
        )
        print(f"Model: {response.model}")
        print(f"Usage - Completion tokens: {response.usage.prompt_tokens}")
        print(f"Usage - Prompt tokens: {response.usage.prompt_tokens}")
        print(f"Usage - Total tokens: {response.usage.total_tokens}")
        print(f"Content1: {response.choices[0].message.content}")
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
        print(f"Model: {response.model}")
        print(f"Usage - Completion tokens: {response.usage.prompt_tokens}")
        print(f"Usage - Prompt tokens: {response.usage.prompt_tokens}")
        print(f"Usage - Total tokens: {response.usage.total_tokens}")
        print(f"Content2: {response.choices[0].message.content}")
        log_api_call('get_new_translated_string_4o_stylish', original_text, response, 'gpt-4o-mini' if mode=='1' else 'gpt-4o')
        return response#.choices[0].message.content
