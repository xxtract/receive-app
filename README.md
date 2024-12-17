# Receive Products Application

A Node.js application for searching and managing product receipts using GLN (Global Location Number) and GTIN (Global Trade Item Number).

## Technical Stack

- **Backend:**
  - Node.js
  - Express.js
  - MySQL
  - CORS enabled for API access

- **Frontend:**
  - HTML5
  - CSS3
  - Vanilla JavaScript

- **Testing:**
  - Jest
  - Supertest for API testing

## Features

1. **Company Search:**
   - Search by GLN (13-digit number)
   - Search by company name
   - Returns detailed company information

2. **Product Search:**
   - Search using GLN and GTIN combination
   - Automatic GTIN-14 formatting
   - Detailed product information display

3. **API Endpoints:**
   - `/api/search`: Combined endpoint for company search
   - `/api/search-product`: Product search endpoint
   - RESTful API design with JSON responses

4. **Error Handling:**
   - Comprehensive error messages
   - Input validation
   - Proper HTTP status codes

## Installation

1. Clone the repository:
```bash
git clone https://github.com/xxtract/receive-app.git
cd receive-app
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables:
   - Create a `.env` file in the root directory
   - Add the following variables:
```env
PORT=3000
DB_HOST=your_database_host
DB_USER=your_database_user
DB_PASSWORD=your_database_password
DB_NAME=your_database_name
```

4. Start the application:
   - Development mode: `npm run dev`
   - Production mode: `npm start`
   - Run tests: `npm test`

## Usage

1. **Company Search:**
   - Enter a 13-digit GLN number or company name
   - Results will show matching companies with details

2. **Product Search:**
   - Enter both GLN and GTIN
   - System automatically formats GTIN to 14 digits
   - View detailed product information

## Testing

The application includes comprehensive test coverage:
- Unit tests for GTIN formatting
- API endpoint testing
- Database query testing

Run tests using:
```bash
npm test
```