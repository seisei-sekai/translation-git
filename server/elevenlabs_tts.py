from elevenlabs.client import ElevenLabs, VoiceSettings
from elevenlabs import save
import time
import json
import os
import re

class VoiceCloner:
    def __init__(self, api_key):
        self.client = ElevenLabs(api_key=api_key)

    def parse_raw_voices_text(self, raw_text):
        # ... existing code ...
        formatted_text = raw_text.replace("Voice(", "{").replace("), Voice", "}, {")
        # ... rest of the method ...
        return data

    def create_and_get_clone_id(self, voice_name: str, files: list) -> str:
        voices = self.client.voices.get_all()
        voice_id = self.get_voice_id_by_name(voice_name, voices)
        
        if voice_id is None:
            denoised_audio = [self.denoise_reference_audio(files)]
            new_voice = self.client.clone(
                name=voice_name,
                description="",
                files=denoised_audio,
            )
            voice_id = new_voice.voice_id
        
        return voice_id

    def get_voice_id_by_name(self, voice_name, voices):
        for voice in voices.voices:
            if hasattr(voice, 'name') and voice.name.lower() == voice_name.lower():
                print(voice.voice_id)
                return voice.voice_id
        return None

    def denoise_reference_audio(self, audio_file_path):
        output_file_path = f"cleaned_{os.path.basename(audio_file_path)}"
        with open(audio_file_path, "rb") as audio_file:
            isolated_audio_iterator = self.client.audio_isolation.audio_isolation(audio=audio_file)
            with open(output_file_path, "wb") as output_file:
                for chunk in isolated_audio_iterator:
                    output_file.write(chunk)
        print(f"Isolated audio saved to {output_file_path}")
        return output_file_path

    def text_to_speech(self, text, voice_id, target_language, output_file):
        start_time = time.time()
        audio = self.client.text_to_speech.convert(
            text=text,
            voice_id=voice_id,
            model_id="eleven_turbo_v2_5",
            language_code=target_language,
            voice_settings=VoiceSettings(
                stability=0.9,
                similarity_boost=0.75,
                style=0.0,
            ),
        )
        print(f"Text-to-speech conversion time: {time.time() - start_time:.2f} seconds")
        save(audio, output_file)
        return output_file

def main():
    api_key = "sk_dd7623824db1fbb87949213078197195f551f2245dc6fc84"
    voice_cloner = VoiceCloner(api_key)

    voice_name = "test_3"  # Should be equal to user_id
    reference_audio = "./benny_3.mp3"  # should be in the format of ./<user_id>.mp3
    text = "申し訳ありませんが、金正恩に関する内容を歌頌する文書はお手伝いできません。もし他のリクエストがありましたら、ぜひ教えてください！"
    target_language = 'ja'
    output_file = "./test_3_ja.mp3"

    voice_id = voice_cloner.create_and_get_clone_id(voice_name, reference_audio)
    voice_cloner.text_to_speech(text, voice_id, target_language, output_file)

if __name__ == "__main__":
    main()
