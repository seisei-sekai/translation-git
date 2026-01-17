"""
Encryption Service
Simple XOR-based encryption/decryption for text
"""


def simple_encrypt(text):
    """
    Fast bitwise XOR encryption
    
    Args:
        text (str): Text to encrypt
        
    Returns:
        str: Encrypted text, or None if input is empty
    """
    if not text:
        return None
    key = 42  # Simple encryption key
    return ''.join(chr(ord(c) ^ key) for c in text)


def simple_decrypt(encrypted_text):
    """
    Fast bitwise XOR decryption (same as encryption)
    XOR is its own inverse operation
    
    Args:
        encrypted_text (str): Text to decrypt
        
    Returns:
        str: Decrypted text, or None if input is empty
    """
    if not encrypted_text:
        return None
    return simple_encrypt(encrypted_text)  # XOR is its own inverse

# Aliases for backwards compatibility
encrypt_data = simple_encrypt
decrypt_data = simple_decrypt
