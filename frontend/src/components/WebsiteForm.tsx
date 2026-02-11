import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { websiteApi, CreateWebsiteRequest } from '../services/api';

interface WebsiteFormProps {
  onSuccess?: () => void;
}

interface FormData extends CreateWebsiteRequest {}

const WebsiteForm: React.FC<WebsiteFormProps> = ({ onSuccess }) => {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FormData>();

  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitSuccess, setSubmitSuccess] = useState<boolean>(false);

  const onSubmit = async (data: FormData) => {
    try {
      setSubmitError(null);
      setSubmitSuccess(false);

      await websiteApi.createWebsite(data);

      setSubmitSuccess(true);
      reset();

      // Call success callback after a short delay to show success message
      if (onSuccess) {
        setTimeout(() => {
          onSuccess();
        }, 1500);
      }
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : 'Failed to create website');
    }
  };

  return (
    <div className="website-form">
      <h2>Create New Website</h2>

      {submitSuccess && (
        <div className="alert alert-success">
          ✓ Website created successfully! It will be provisioned shortly.
        </div>
      )}

      {submitError && (
        <div className="alert alert-error">
          ✗ {submitError}
        </div>
      )}

      <form onSubmit={handleSubmit(onSubmit)}>
        <div className="form-group">
          <label htmlFor="websiteName">Website Name *</label>
          <input
            id="websiteName"
            type="text"
            {...register('websiteName', {
              required: 'Website name is required',
              pattern: {
                value: /^[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?$/,
                message: 'Must be lowercase, start/end with alphanumeric, and use only alphanumeric and hyphens (max 63 chars)',
              },
            })}
            placeholder="my-awesome-website"
            className={errors.websiteName ? 'error' : ''}
          />
          {errors.websiteName && (
            <span className="error-message">{errors.websiteName.message}</span>
          )}
          <small>DNS-compliant name (lowercase, alphanumeric, hyphens)</small>
        </div>

        <div className="form-group">
          <label htmlFor="websiteTitle">Website Title *</label>
          <input
            id="websiteTitle"
            type="text"
            {...register('websiteTitle', {
              required: 'Website title is required',
              maxLength: {
                value: 255,
                message: 'Title must be 255 characters or less',
              },
            })}
            placeholder="My Awesome Website"
            className={errors.websiteTitle ? 'error' : ''}
          />
          {errors.websiteTitle && (
            <span className="error-message">{errors.websiteTitle.message}</span>
          )}
        </div>

        <div className="form-group">
          <label htmlFor="htmlContent">HTML Content *</label>
          <textarea
            id="htmlContent"
            rows={12}
            {...register('htmlContent', {
              required: 'HTML content is required',
              validate: {
                maxSize: (value) => {
                  const size = new Blob([value]).size;
                  return size <= 102400 || `HTML content must be 100KB or less (current: ${Math.round(size / 1024)}KB)`;
                },
              },
            })}
            placeholder="<html><body><h1>Hello World!</h1></body></html>"
            className={errors.htmlContent ? 'error' : ''}
          />
          {errors.htmlContent && (
            <span className="error-message">{errors.htmlContent.message}</span>
          )}
          <small>Max 100KB of HTML content</small>
        </div>

        <button type="submit" disabled={isSubmitting} className="btn btn-primary">
          {isSubmitting ? 'Creating...' : 'Create Website'}
        </button>
      </form>
    </div>
  );
};

export default WebsiteForm;
