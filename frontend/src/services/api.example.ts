/**
 * API Service Usage Examples
 * 
 * This file demonstrates how to use the configured Axios API service
 * in your React components.
 */

import api from './api';
import toast from 'react-hot-toast';

// ============================================================================
// Example 1: Simple GET Request
// ============================================================================

export async function fetchUserProfile() {
  try {
    const response = await api.get('/api/users/profile');
    return response.data.data; // Returns user object
  } catch (error: any) {
    // Error toast already shown by interceptor
    // Just throw or handle additional logic
    throw error;
  }
}

// ============================================================================
// Example 2: POST Request with Data
// ============================================================================

export async function updateUserProfile(data: { fullName: string; email: string }) {
  try {
    const response = await api.patch('/api/users/profile', data);
    
    // Show success toast
    toast.success('Profile updated successfully!');
    
    return response.data.data;
  } catch (error: any) {
    // Error already handled by interceptor
    throw error;
  }
}

// ============================================================================
// Example 3: Using in React Component with Loading State
// ============================================================================

/*
import { useState, useEffect } from 'react';
import api from '../services/api';

function UserProfileComponent() {
  const [profile, setProfile] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        setIsLoading(true);
        const response = await api.get('/api/users/profile');
        setProfile(response.data.data);
      } catch (err: any) {
        setError(err.response?.data?.message || 'Failed to load profile');
      } finally {
        setIsLoading(false);
      }
    };

    fetchProfile();
  }, []);

  if (isLoading) return <div>Loading...</div>;
  if (error) return <div>Error: {error}</div>;
  if (!profile) return null;

  return <div>Welcome, {profile.fullName}!</div>;
}
*/

// ============================================================================
// Example 4: Form Submission
// ============================================================================

/*
import { useState } from 'react';
import api from '../services/api';
import toast from 'react-hot-toast';

function CreateEventForm() {
  const [formData, setFormData] = useState({
    title: '',
    description: '',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const response = await api.post('/api/events', formData);
      toast.success('Event created successfully!');
      // Navigate or reset form
    } catch (error) {
      // Error toast already shown by interceptor
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <input
        value={formData.title}
        onChange={(e) => setFormData({ ...formData, title: e.target.value })}
      />
      <button type="submit" disabled={isSubmitting}>
        {isSubmitting ? 'Creating...' : 'Create Event'}
      </button>
    </form>
  );
}
*/

// ============================================================================
// Example 5: DELETE Request
// ============================================================================

export async function deleteEvent(eventId: string) {
  try {
    await api.delete(`/api/events/${eventId}`);
    toast.success('Event deleted successfully!');
    return true;
  } catch (error: any) {
    // Error toast already shown
    return false;
  }
}

// ============================================================================
// Example 6: File Upload
// ============================================================================

export async function uploadEventImage(eventId: string, file: File) {
  const formData = new FormData();
  formData.append('image', file);

  try {
    const response = await api.post(`/api/events/${eventId}/image`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    
    toast.success('Image uploaded successfully!');
    return response.data.data.imageUrl;
  } catch (error: any) {
    throw error;
  }
}

// ============================================================================
// Example 7: Query Parameters
// ============================================================================

export async function searchEvents(query: string, page: number = 1, limit: number = 10) {
  try {
    const response = await api.get('/api/events', {
      params: {
        search: query,
        page,
        limit,
      },
    });
    
    return {
      events: response.data.data.events,
      pagination: response.data.data.pagination,
    };
  } catch (error: any) {
    throw error;
  }
}

// ============================================================================
// Example 8: Request Cancellation (for search/autocomplete)
// ============================================================================

/*
import { useEffect, useState } from 'react';
import axios from 'axios';
import api from '../services/api';

function SearchComponent() {
  const [searchQuery, setSearchQuery] = useState('');
  const [results, setResults] = useState([]);

  useEffect(() => {
    // Create cancel token
    const source = axios.CancelToken.source();

    const searchEvents = async () => {
      if (!searchQuery) {
        setResults([]);
        return;
      }

      try {
        const response = await api.get('/api/events/search', {
          params: { q: searchQuery },
          cancelToken: source.token,
        });
        setResults(response.data.data);
      } catch (error) {
        if (!axios.isCancel(error)) {
          console.error('Search failed:', error);
        }
      }
    };

    // Debounce search
    const timer = setTimeout(searchEvents, 300);

    // Cleanup: cancel request and clear timer
    return () => {
      source.cancel('Search query changed');
      clearTimeout(timer);
    };
  }, [searchQuery]);

  return (
    <div>
      <input
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
        placeholder="Search events..."
      />
      <ul>
        {results.map((event: any) => (
          <li key={event.id}>{event.title}</li>
        ))}
      </ul>
    </div>
  );
}
*/

// ============================================================================
// Example 9: Custom Error Handling
// ============================================================================

export async function fetchEventWithCustomErrorHandling(eventId: string) {
  try {
    const response = await api.get(`/api/events/${eventId}`);
    return response.data.data;
  } catch (error: any) {
    // The interceptor already shows a toast, but you can add custom logic
    
    if (error.response?.status === 404) {
      // Event not found - maybe redirect to events list
      console.log('Event not found, redirecting...');
    } else if (error.response?.status === 403) {
      // User not authorized to view this event
      console.log('Not authorized to view this event');
    }
    
    throw error;
  }
}

// ============================================================================
// Example 10: Batch Requests (using Promise.all)
// ============================================================================

export async function fetchDashboardData() {
  try {
    const [profileResponse, eventsResponse, statsResponse] = await Promise.all([
      api.get('/api/users/profile'),
      api.get('/api/events?limit=5'),
      api.get('/api/dashboard/stats'),
    ]);

    return {
      profile: profileResponse.data.data,
      events: eventsResponse.data.data,
      stats: statsResponse.data.data,
    };
  } catch (error: any) {
    // If any request fails, error toast will be shown
    throw error;
  }
}

// ============================================================================
// Notes:
// ============================================================================

/*
1. Authorization Header:
   - Automatically attached to all requests by the request interceptor
   - Uses access token from AuthContext
   - No need to manually add Authorization header

2. Token Refresh:
   - Automatically handles 401 TOKEN_EXPIRED errors
   - Fetches new tokens using refresh token
   - Retries original request with new access token
   - Logs out user if refresh fails

3. Error Handling:
   - All errors automatically show toast notifications
   - Error message extracted from response.data.message
   - You can add additional error handling in catch blocks

4. Base URL:
   - Configured from VITE_API_BASE_URL environment variable
   - All requests are relative to this base URL
   - Example: api.get('/api/users') → http://localhost:5000/api/users

5. CORS:
   - Backend must have CORS configured to accept frontend origin
   - withCredentials is false (not using cookies)
   - Authorization header must be in CORS allowedHeaders

6. Testing:
   - Mock the api module in tests using vi.mock()
   - See api.test.ts for examples
*/
