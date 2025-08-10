#!/bin/bash

# List of files to update
files=(
    "/workspaces/otoolebox/uuid-generator/index.html"
    "/workspaces/otoolebox/hash-generator/index.html"
    "/workspaces/otoolebox/passphrase-generator/index.html"
    "/workspaces/otoolebox/diff-utilities/index.html"
    "/workspaces/otoolebox/closed-loop/index.html"
)

# Old Ko-fi button code
old_button='            <div style="margin-top: 1rem;">
                <script type='\''text/javascript'\'' src='\''https://storage.ko-fi.com/cdn/widget/Widget_2.js'\''></script>
                <script type='\''text/javascript'\''>kofiwidget2.init('\''Buy Me a Coffee or Beer'\'', '\''#64748b'\'', '\''F1F41J70Y8'\'');kofiwidget2.draw();</script>
            </div>'

# New custom Ko-fi button code
new_button='            <div style="margin-top: 1rem;">
                <a 
                    href="https://ko-fi.com/otoolecf" 
                    target="_blank" 
                    class="custom-kofi-btn"
                    style="
                        display: inline-flex;
                        align-items: center;
                        gap: 0.5rem;
                        padding: 0.5rem 1rem;
                        background: #64748b;
                        color: white;
                        text-decoration: none;
                        border-radius: 4px;
                        font-size: 0.9rem;
                        font-weight: 500;
                        transition: background-color 0.2s, transform 0.2s;
                    "
                >
                    <img src="../kofi_symbol.svg" width="16" height="16" alt="Ko-fi icon" />
                    Buy Me a Coffee or Beer
                </a>
            </div>'

# Update each file
for file in "${files[@]}"; do
    echo "Updating $file"
    # Create a temporary file with the replacement
    sed 's|            <div style="margin-top: 1rem;">.*<script type='\''text/javascript'\''>kofiwidget2\.init.*</script>.*</div>|NEW_BUTTON_PLACEHOLDER|g' "$file" | \
    sed "s|NEW_BUTTON_PLACEHOLDER|${new_button//$'\n'/\\n}|g" > "$file.tmp"
    
    # Move the temporary file back
    mv "$file.tmp" "$file"
done

echo "All files updated!"