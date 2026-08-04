# INSTALLATION & QUICK START GUIDE

## Prerequisites
- **Node.js**: v18.0.0 or higher
- **Python**: v3.10.0 or higher
- **Git**: v2.30.0 or higher

## Step-by-Step Installation

```bash
# Clone the repository
git clone https://github.com/aashishrajput9838/academicuniverse.git
cd academicuniverse

# Install backend dependencies
npm install

# Install Python requirements
pip install -r requirements.txt
```

## Quick Verification
Run headless framework verification dry-run:
```bash
npm run benchmark:dry-run
```
Expected output: `360/360 specimens processed in ~1.48 seconds (242.59 samples/sec)`.
