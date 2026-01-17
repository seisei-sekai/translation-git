# Frontend Dockerfile
FROM node:14

# Set working directory
WORKDIR /app

# Copy package files
COPY package.json ./

# Clear npm cache and remove any existing node_modules
RUN npm cache clean --force && \
    rm -rf node_modules

# Install specific version of problematic dependencies first
RUN npm install @jridgewell/gen-mapping@0.3.2
RUN npm install @babel/generator@7.22.5

# Install the rest of the dependencies and javascript-obfuscator
RUN npm install --legacy-peer-deps
# RUN npm install javascript-obfuscator --save-dev

# Copy the rest of the application
COPY . .

# Build the React app
ENV NODE_ENV=production
ENV GENERATE_SOURCEMAP=false
# ENV NODE_OPTIONS="--max-old-space-size=4096"
# Build the application
RUN npm run build

# # Create a script to obfuscate files one by one
# RUN echo '#!/bin/sh\n\
# for file in ./build/static/js/*.js; do\n\
#   echo "Obfuscating $file..."\n\
#   NODE_OPTIONS="--max-old-space-size=4096" npx javascript-obfuscator "$file" \
#     --output "$file" \
#     --config obfuscator.config.json || exit 1\n\
# done' > obfuscate.sh && chmod +x obfuscate.sh

# # Run the obfuscation script
# RUN ./obfuscate.sh

# Install serve
RUN npm install -g serve

EXPOSE 3000

CMD ["serve", "-s", "build", "-l", "3000"]
