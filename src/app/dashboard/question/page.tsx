'use client';

import { useState } from 'react';

// Question model schema based on models.py
interface FieldDefinition {
  name: string;
  type: string;
  max_length?: number;
  choices?: Array<{ value: string; label: string }>;
  default?: any;
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
}

const questionModelSchema: FieldDefinition[] = [
  {
    name: 'id',
    type: 'UUIDField',
    primary_key: true,
    default: 'uuid.uuid4',
    editable: false,
    help_text: 'Primary key using UUID'
  },
  {
    name: 'text',
    type: 'TextField',
    help_text: 'The question text content'
  },
  {
    name: 'tags',
    type: 'ManyToManyField',
    related_name: 'questions',
    help_text: 'Tags associated with this question'
  },
  {
    name: 'question_type',
    type: 'CharField',
    max_length: 20,
    choices: [
      { value: 'mandatory', label: 'Mandatory' },
      { value: 'answered', label: 'Answered' },
      { value: 'unanswered', label: 'Unanswered' },
      { value: 'required', label: 'Required' },
      { value: 'submitted', label: 'Submitted' }
    ],
    default: 'unanswered',
    help_text: 'Type of question'
  },
  {
    name: 'is_required_for_match',
    type: 'BooleanField',
    default: false,
    help_text: 'Whether this question is required for matching'
  },
  {
    name: 'created_at',
    type: 'DateTimeField',
    auto_now_add: true,
    help_text: 'When the question was created'
  },
  {
    name: 'updated_at',
    type: 'DateTimeField',
    auto_now: true,
    help_text: 'When the question was last updated'
  }
];

const tagModelSchema: FieldDefinition[] = [
  {
    name: 'id',
    type: 'AutoField',
    primary_key: true,
    help_text: 'Primary key'
  },
  {
    name: 'name',
    type: 'CharField',
    max_length: 50,
    choices: [
      { value: 'value', label: 'Value' },
      { value: 'lifestyle', label: 'Lifestyle' },
      { value: 'look', label: 'Look' },
      { value: 'trait', label: 'Trait' },
      { value: 'hobby', label: 'Hobby' },
      { value: 'interest', label: 'Interest' }
    ],
    unique: true,
    help_text: 'Tag name'
  }
];

export default function QuestionModelPage() {
  const [selectedModel, setSelectedModel] = useState<'question' | 'tag'>('question');

  const currentSchema = selectedModel === 'question' ? questionModelSchema : tagModelSchema;

  const getFieldTypeColor = (type: string) => {
    const colors: Record<string, string> = {
      'UUIDField': 'bg-purple-100 text-purple-800',
      'TextField': 'bg-blue-100 text-blue-800',
      'CharField': 'bg-green-100 text-green-800',
      'BooleanField': 'bg-yellow-100 text-yellow-800',
      'DateTimeField': 'bg-red-100 text-red-800',
      'ManyToManyField': 'bg-indigo-100 text-indigo-800',
      'AutoField': 'bg-gray-100 text-gray-800'
    };
    return colors[type] || 'bg-gray-100 text-gray-800';
  };

  const getFieldIcon = (type: string) => {
    const icons: Record<string, string> = {
      'UUIDField': 'fas fa-fingerprint',
      'TextField': 'fas fa-align-left',
      'CharField': 'fas fa-font',
      'BooleanField': 'fas fa-toggle-on',
      'DateTimeField': 'fas fa-clock',
      'ManyToManyField': 'fas fa-link',
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
            <span>Question</span>
            <span className="mx-2">{'>'}</span>
            <span className="text-gray-900">Model Schema</span>
          </nav>
          <h1 className="text-3xl font-bold text-gray-900">Question Model Schema</h1>
        </div>
      </div>

      {/* Model Selection */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex space-x-4 mb-6">
          <button
            onClick={() => setSelectedModel('question')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors duration-200 cursor-pointer ${
              selectedModel === 'question'
                ? 'bg-[#672DB7] text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Question Model
          </button>
          <button
            onClick={() => setSelectedModel('tag')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors duration-200 cursor-pointer ${
              selectedModel === 'tag'
                ? 'bg-[#672DB7] text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Tag Model
          </button>
        </div>

        <div className="mb-4">
          <h2 className="text-lg font-semibold text-gray-900 mb-2">
            {selectedModel === 'question' ? 'Question' : 'Tag'} Model Fields
          </h2>
          <p className="text-sm text-gray-600">
            Database schema for the {selectedModel} model. This is a read-only view of the model structure.
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
              {selectedModel === 'question' ? 'questions' : 'tags'}
            </code>
          </div>
          <div>
            <h3 className="text-sm font-medium text-gray-700 mb-2">Python Class</h3>
            <code className="bg-gray-100 px-3 py-2 rounded text-sm font-mono">
              {selectedModel === 'question' ? 'Question' : 'Tag'}
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