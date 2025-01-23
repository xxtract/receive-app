import unittest
from app.main import app
from app.product_matcher import match_product
from unittest.mock import patch, MagicMock

class TestProductMatcher(unittest.TestCase):
    def setUp(self):
        self.app = app.test_client()

    @patch('app.product_matcher.GPC')
    def test_match_product(self, mock_gpc):
        # Mock data
        mock_categories = ['Food', 'Beverage']
        mock_records = [
            {'category': 'Food', 'codeDescription': 'Fruits', 'codeDefinition': 'Fresh apples and pears', 'code': '10000100'},
            {'category': 'Food', 'codeDescription': 'Vegetables', 'codeDefinition': 'Fresh carrots and potatoes', 'code': '10000200'},
            {'category': 'Beverage', 'codeDescription': 'Soft Drinks', 'codeDefinition': 'Carbonated cola drinks', 'code': '20000100'},
        ]

        # Set up mock implementations
        mock_gpc.distinct.return_value = mock_categories
        mock_gpc.find.return_value = mock_records

        # Test cases
        test_cases = [
            ('Fresh red apples', '10000100'),
            ('Carbonated cola beverage', '20000100'),
            ('Fresh green vegetables', '10000200'),
            ('Electronic device', None),
        ]

        for description, expected_code in test_cases:
            result = match_product(description)
            self.assertEqual(result, expected_code)

        # Verify that the mocks were called correctly
        mock_gpc.distinct.assert_called_with('category')
        mock_gpc.find.assert_called_with({'category': {'$in': mock_categories}})

    def test_match_product_endpoint(self):
        # Test the /api/match-product endpoint
        response = self.app.post('/api/match-product', json={'productDescription': 'Fresh red apples'})
        self.assertEqual(response.status_code, 200)
        self.assertIn('code', response.json)

        # Test with missing product description
        response = self.app.post('/api/match-product', json={})
        self.assertEqual(response.status_code, 400)
        self.assertIn('error', response.json)

if __name__ == '__main__':
    unittest.main()