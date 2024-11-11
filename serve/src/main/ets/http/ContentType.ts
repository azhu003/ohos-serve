/*
 * The MIT License (MIT)
 * Copyright (C) 2024 Huawei Device Co., Ltd.
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 */

import type buffer from '@ohos.buffer';

const NUM_ONE: number = 1;
const NUM_TWO: number = 2;

/**
 * 提供一个基本的ContentType类
 */
export class ContentType {
  private asciiEncoding: buffer.BufferEncoding = 'ascii';
  private multipartFromDataHeader: string = 'multipart/form-data';
  private contentRegex: RegExp = /[ |\t]*([^/^ ^;^,]+[^\"^'^;^,]+)/;
  private charsetRegex: RegExp = /[ |\t]*(charset)[ |\t]*=[ |\t]*['|\"]?([^\"^'^;^,]*)['|\"]?/;
  private boundaryRegex: RegExp = /[ |\t]*(boundary)[ |\t]*=[ |\t]*['|\"]?([^\"^'^;^,]*)['|\"]?/;
  private contentTypeHeader: string;
  private contentType: string;
  private encoding: buffer.BufferEncoding;
  private boundary: string;

  /**
   * @param contentTypeHeader 请求体的Content-type
   **/
  constructor(contentTypeHeader: string) {
    this.contentTypeHeader = contentTypeHeader;
    const isContentType = Boolean(contentTypeHeader);
    this.contentType = isContentType ? this.getDetailFromContentHeader(contentTypeHeader,
      this.contentRegex, '', NUM_ONE) : '';
    let encodingString = this.getDetailFromContentHeader(contentTypeHeader,
      this.charsetRegex, '', NUM_TWO).toLowerCase() as buffer.BufferEncoding;
    this.encoding = isContentType ? encodingString : 'utf-8';
    const isMultipart = this.isMultipart();
    this.boundary =
      isMultipart ? this.getDetailFromContentHeader(contentTypeHeader, this.boundaryRegex, '', NUM_TWO) : '';
  }

  static TEXT_PLAIN = 'text/plain; charset=UTF-8'
  static TEXT_HTML = 'text/html; charset=UTF-8'
  static APPLICATION_JSON = 'application/json'
  static APPLICATION_XML = 'application/xml'
  static APPLICATION_FORM_URLENCODED = 'application/x-www-form-urlencoded'
  static APPLICATION_STREAM = 'application/octet-stream'
  static IMAGE_JPEG = 'image/jpeg'

  /**
   * 返回整个content-type字符串
   **/
  public getContentTypeHeader(): string {
    return this.contentTypeHeader;
  }

  /**
   * 返回content-type值
   **/
  public getContentType(): string {
    return this.contentType;
  }

  /**
   * 返回content-type中的编码方式
   **/
  public getEncoding(): string {
    return !this.encoding ? this.asciiEncoding : this.encoding;
  }

  /**
   * 返回content-type中的边界分隔符
   **/
  public getBoundary(): string {
    return this.boundary;
  }

  /**
   * 判断是否为multipart类型
   *
   * @return boolean
   **/
  public isMultipart(): boolean {
    return this.multipartFromDataHeader.toLowerCase() === this.contentType;
  }

  /**
   * 如果不存在编码，默认设置为charset=UTF-8。
   *
   * @return this
   **/
  public tryUTF8(): ContentType {
    if (!this.encoding) {
      return new ContentType(`${this.contentTypeHeader}; charset=UTF-8`);
    }
    return this;
  }

  /**
   * 返回content-type中指定的参数
   *
   * @param contentTypeHeader the entire content-type string
   * @param pattern 获取特定字段值的正则表达式
   * @param defaultValue content-type的值
   * @group number
   * @return 返回特定参数的值
   **/
  private getDetailFromContentHeader(contentTypeHeader: string, pattern: RegExp,
    defaultValue: string, group: number): string {
    const matcher: RegExpExecArray | null = new RegExp(pattern).exec(contentTypeHeader);
    return matcher?.[group] ? matcher[group] : defaultValue;
  }
}