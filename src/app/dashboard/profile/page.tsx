'use client';

import { useState } from 'react';

// Profile model schema based on models.py
interface FieldDefinition {
  name: string;
  type: string;
  max_length?: number;
  choices?: Array<{ value: string; label: string }>;
  default?: string | boolean | number;
  null?: boolean;
  blank?: boolean;
  help_text?: string;
  related_name?: string;
  on_delete?: string;
  auto_now?: boolean;
  auto_now_add?: boolean;
  editable?: boolean;
  unique?: boolean;
  primary_key?: boolean;
  upload_to?: string;
  validators?: string[];
}

const userModelSchema: FieldDefinition[] = [
  {
    name: 'id',
    type: 'UUIDField',
    primary_key: true,
    default: 'uuid.uuid4',
    editable: false,
    help_text: 'Primary key using UUID'
  },
  {
    name: 'username',
    type: 'CharField',
    max_length: 150,
    unique: true,
    help_text: 'Username for login'
  },
  {
    name: 'email',
    type: 'EmailField',
    unique: true,
    help_text: 'User email address'
  },
  {
    name: 'first_name',
    type: 'CharField',
    max_length: 150,
    blank: true,
    help_text: 'User first name'
  },
  {
    name: 'last_name',
    type: 'CharField',
    max_length: 150,
    blank: true,
    help_text: 'User last name'
  },
  {
    name: 'profile_photo',
    type: 'ImageField',
    upload_to: 'profile_photos/',
    null: true,
    blank: true,
    help_text: 'User profile picture'
  },
  {
    name: 'age',
    type: 'PositiveIntegerField',
    null: true,
    blank: true,
    help_text: 'User age'
  },
  {
    name: 'date_of_birth',
    type: 'DateField',
    null: true,
    blank: true,
    help_text: 'User date of birth'
  },
  {
    name: 'height',
    type: 'PositiveIntegerField',
    null: true,
    blank: true,
    help_text: 'Height in cm'
  },
  {
    name: 'from_location',
    type: 'CharField',
    max_length: 100,
    null: true,
    blank: true,
    help_text: 'Where the user is originally from'
  },
  {
    name: 'live',
    type: 'CharField',
    max_length: 100,
    null: true,
    blank: true,
    help_text: 'Where the user currently lives'
  },
  {
    name: 'bio',
    type: 'TextField',
    max_length: 500,
    blank: true,
    help_text: 'User biography'
  },
  {
    name: 'is_online',
    type: 'BooleanField',
    default: false,
    help_text: 'Whether user is currently online'
  },
  {
    name: 'last_seen',
    type: 'DateTimeField',
    default: 'timezone.now',
    help_text: 'Last time user was active'
  },
  {
    name: 'is_banned',
    type: 'BooleanField',
    default: false,
    help_text: 'Whether user is banned'
  },
  {
    name: 'ban_reason',
    type: 'TextField',
    blank: true,
    help_text: 'Reason for ban if applicable'
  },
  {
    name: 'ban_date',
    type: 'DateTimeField',
    null: true,
    blank: true,
    help_text: 'Date when user was banned'
  },
  {
    name: 'questions_answered_count',
    type: 'PositiveIntegerField',
    default: 0,
    help_text: 'Number of questions answered by user'
  },
  {
    name: 'is_active',
    type: 'BooleanField',
    default: true,
    help_text: 'Whether user account is active'
  },
  {
    name: 'is_staff',
    type: 'BooleanField',
    default: false,
    help_text: 'Whether user has staff permissions'
  },
  {
    name: 'is_superuser',
    type: 'BooleanField',
    default: false,
    help_text: 'Whether user has superuser permissions'
  },
  {
    name: 'date_joined',
    type: 'DateTimeField',
    auto_now_add: true,
    help_text: 'When user account was created'
  },
  {
    name: 'last_login',
    type: 'DateTimeField',
    null: true,
    blank: true,
    help_text: 'Last time user logged in'
  }
];

const userAnswerModelSchema: FieldDefinition[] = [
  {
    name: 'id',
    type: 'UUIDField',
    primary_key: true,
    default: 'uuid.uuid4',
    editable: false,
    help_text: 'Primary key using UUID'
  },
  {
    name: 'user',
    type: 'ForeignKey',
    related_name: 'answers',
    on_delete: 'CASCADE',
    help_text: 'User who answered the question'
  },
  {
    name: 'question',
    type: 'ForeignKey',
    related_name: 'user_answers',
    on_delete: 'CASCADE',
    help_text: 'Question that was answered'
  },
  {
    name: 'me_answer',
    type: 'PositiveIntegerField',
    validators: ['MinValueValidator(1)', 'MaxValueValidator(6)'],
    help_text: '1-5 for specific answers, 6 for open to all'
  },
  {
    name: 'me_open_to_all',
    type: 'BooleanField',
    default: false,
    help_text: 'Whether user is open to all options'
  },
  {
    name: 'me_multiplier',
    type: 'PositiveIntegerField',
    default: 1,
    help_text: 'Weight multiplier for this answer'
  },
  {
    name: 'me_share',
    type: 'BooleanField',
    default: true,
    help_text: 'Whether to share this answer'
  },
  {
    name: 'looking_for_answer',
    type: 'PositiveIntegerField',
    validators: ['MinValueValidator(1)', 'MaxValueValidator(6)'],
    help_text: '1-5 for specific answers, 6 for open to all'
  },
  {
    name: 'looking_for_open_to_all',
    type: 'BooleanField',
    default: false,
    help_text: 'Whether user is open to all options for partner'
  },
  {
    name: 'looking_for_multiplier',
    type: 'PositiveIntegerField',
    default: 1,
    help_text: 'Weight multiplier for partner preference'
  },
  {
    name: 'looking_for_share',
    type: 'BooleanField',
    default: true,
    help_text: 'Whether to share this preference'
  },
  {
    name: 'created_at',
    type: 'DateTimeField',
    auto_now_add: true,
    help_text: 'When the answer was created'
  },
  {
    name: 'updated_at',
    type: 'DateTimeField',
    auto_now: true,
    help_text: 'When the answer was last updated'
  }
];

export default function ProfileModelPage() {
  const [selectedModel, setSelectedModel] = useState<'user' | 'user_answer'>('user');

  const currentSchema = selectedModel === 'user' ? userModelSchema : userAnswerModelSchema;

  const getFieldTypeColor = (type: string) => {
    const colors: Record<string, string> = {
      'UUIDField': 'bg-purple-100 text-purple-800',
      'CharField': 'bg-green-100 text-green-800',
      'EmailField': 'bg-blue-100 text-blue-800',
      'TextField': 'bg-indigo-100 text-indigo-800',
      'PositiveIntegerField': 'bg-yellow-100 text-yellow-800',
      'DateField': 'bg-red-100 text-red-800',
      'DateTimeField': 'bg-orange-100 text-orange-800',
      'BooleanField': 'bg-pink-100 text-pink-800',
      'ImageField': 'bg-teal-100 text-teal-800',
      'ForeignKey': 'bg-gray-100 text-gray-800',
      'AutoField': 'bg-gray-100 text-gray-800'
    };
    return colors[type] || 'bg-gray-100 text-gray-800';
  };

  const getFieldIcon = (type: string) => {
    const icons: Record<string, string> = {
      'UUIDField': 'fas fa-fingerprint',
      'CharField': 'fas fa-font',
      'EmailField': 'fas fa-envelope',
      'TextField': 'fas fa-align-left',
      'PositiveIntegerField': 'fas fa-hashtag',
      'DateField': 'fas fa-calendar',
      'DateTimeField': 'fas fa-clock',
      'BooleanField': 'fas fa-toggle-on',
      'ImageField': 'fas fa-image',
      'ForeignKey': 'fas fa-link',
      'AutoField': 'fas fa-hashtag'
    };
    return icons[type] || 'fas fa-cube';
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex justify-between items-center">
        <div>
          <nav className="text-sm text-gray-500 mb-2">
            <span>Profile</span>
            <span className="mx-2">{'>'}</span>
            <span className="text-gray-900">Model Schema</span>
          </nav>
          <h1 className="text-3xl font-bold text-gray-900">Profile Model Schema</h1>
        </div>
      </div>

      {/* Model Selection */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex space-x-4 mb-6">
          <button
            onClick={() => setSelectedModel('user')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors duration-200 cursor-pointer ${
              selectedModel === 'user'
                ? 'bg-[#672DB7] text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            User Model
          </button>
          <button
            onClick={() => setSelectedModel('user_answer')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors duration-200 cursor-pointer ${
              selectedModel === 'user_answer'
                ? 'bg-[#672DB7] text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            UserAnswer Model
          </button>
        </div>

        <div className="mb-4">
          <h2 className="text-lg font-semibold text-gray-900 mb-2">
            {selectedModel === 'user' ? 'User' : 'UserAnswer'} Model Fields
          </h2>
          <p className="text-sm text-gray-600">
            Database schema for the {selectedModel === 'user' ? 'User' : 'UserAnswer'} model. This is a read-only view of the model structure.
          </p>
        </div>

        {/* Fields Table */}
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Field Name
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Type
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Properties
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Default
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Help Text
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {currentSchema.map((field, index) => (
                <tr key={field.name} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <span className="text-sm font-medium text-gray-900">{field.name}</span>
                      {field.primary_key && (
                        <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-yellow-100 text-yellow-800">
                          PK
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <i className={`${getFieldIcon(field.type)} mr-2 text-gray-400`}></i>
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getFieldTypeColor(field.type)}`}>
                        {field.type}
                      </span>
                      {field.max_length && (
                        <span className="ml-2 text-xs text-gray-500">
                          ({field.max_length})
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex flex-wrap gap-1">
                      {field.null && (
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800">
                          null
                        </span>
                      )}
                      {field.blank && (
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800">
                          blank
                        </span>
                      )}
                      {field.unique && (
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-purple-100 text-purple-800">
                          unique
                        </span>
                      )}
                      {field.auto_now && (
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-orange-100 text-orange-800">
                          auto_now
                        </span>
                      )}
                      {field.auto_now_add && (
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-red-100 text-red-800">
                          auto_now_add
                        </span>
                      )}
                      {field.editable === false && (
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-800">
                          not editable
                        </span>
                      )}
                      {field.upload_to && (
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-teal-100 text-teal-800">
                          upload_to
                        </span>
                      )}
                      {field.validators && field.validators.length > 0 && (
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-indigo-100 text-indigo-800">
                          validators
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {field.default ? (
                      <code className="bg-gray-100 px-2 py-1 rounded text-xs">
                        {field.default}
                      </code>
                    ) : (
                      <span className="text-gray-400">-</span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-900 max-w-xs">
                    <div className="truncate">{field.help_text || '-'}</div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Model Information */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Model Information</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h3 className="text-sm font-medium text-gray-700 mb-2">Database Table</h3>
            <code className="bg-gray-100 px-3 py-2 rounded text-sm font-mono">
              {selectedModel === 'user' ? 'users' : 'api_useranswer'}
            </code>
          </div>
          <div>
            <h3 className="text-sm font-medium text-gray-700 mb-2">Python Class</h3>
            <code className="bg-gray-100 px-3 py-2 rounded text-sm font-mono">
              {selectedModel === 'user' ? 'User' : 'UserAnswer'}
            </code>
          </div>
          <div>
            <h3 className="text-sm font-medium text-gray-700 mb-2">Total Fields</h3>
            <span className="text-2xl font-bold text-[#672DB7]">{currentSchema.length}</span>
          </div>
          <div>
            <h3 className="text-sm font-medium text-gray-700 mb-2">Required Fields</h3>
            <span className="text-2xl font-bold text-green-600">
              {currentSchema.filter(f => !f.null && !f.blank).length}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
} 